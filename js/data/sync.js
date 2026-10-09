// Syncing the workspace with the signed-in person's account.
// This browser keeps its own copy (fast, works offline); the account is kept the same.
// Only changed records are sent, a moment after a save. Changes from other devices
// arrive while the page is open. For each record the latest change wins.

import { Data } from "./store.js";
import { CURRENT, migrate, emptyState } from "./migrations.js";
import { markSeen, stampChanges } from "./stamps.js";
import { KINDS, metaOf, metaText, decide, liveOf, hasContent, sameContent, shadowOf } from "./sync-merge.js";
import { Storage } from "../storage/storage.js";
import { Cloud, MAX_BYTES } from "../storage/cloud.js";

const LINK = "creation.syncedTo";          // the account this browser's workspace belongs to
const SHADOW = (uid) => "creation.syncShadow." + uid;
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or private */ } },
};
const listeners = new Set();
let uid = null, shadow = {}, timer = null, chain = Promise.resolve();

/** Make sure our copy of a record is sent again (the account holds an older one). */
const resend = (kind, key) => { delete shadow[kind + "/" + key]; };

/** A workspace built from what the account holds. */
function stateFrom(remote) {
  const live = liveOf(remote), m = remote.meta || {};
  return migrate({ version: m.version || CURRENT, settings: m.settings, roomTypes: m.roomTypes, flavours: m.flavours, roomsPan: m.roomsPan, ...live });
}

export const Sync = {
  status: "off", // off | connecting | syncing | synced | offline | error
  error: null,
  tooBig: new Set(), // ids of items too large to sync
  /** Set by the interface: ask which version to keep. Resolves "account" or "browser". */
  ask: async () => "account",
  /** Set by the interface: download a workspace as a backup file, labelled. */
  downloadBackup: () => {},

  subscribe(fn) { listeners.add(fn); },
  set(status, error = null) { this.status = status; this.error = error; listeners.forEach((fn) => fn(this)); },

  /** Signed in: connect, settle any difference, then keep in step. */
  async start(app, userId) {
    if (uid === userId && this.status !== "off") return;
    uid = userId;
    this.set("connecting");
    let remote;
    try {
      await Cloud.connect(app, uid);
      remote = await Cloud.readAll();
    } catch (e) {
      console.warn("Couldn't reach the account:", e);
      this.set(navigator.onLine ? "error" : "offline", "Couldn't reach your account. Your work is still saved in this browser.");
      addEventListener("online", () => { if (uid === userId && this.status !== "synced") { this.status = "off"; this.start(app, userId); } }, { once: true });
      return;
    }
    if ((remote.meta?.version || 0) > CURRENT) {
      this.set("error", "Your account was saved by a newer version of Creation. Reload this page to update it.");
      return;
    }
    if (store.get(LINK) === uid) {
      shadow = store.get(SHADOW(uid)) || shadowOf(remote);
      this.settle(remote);
    } else if (!hasContent(remote)) {
      shadow = {};                                  // empty account: everything here gets uploaded
    } else if (sameContent(Data.state, remote)) {
      shadow = shadowOf(remote);
    } else {
      const theirs = stateFrom(remote);
      const choice = await this.ask();
      if (uid !== userId) return;                   // signed out while the question was open
      if (choice === "account") {
        this.downloadBackup(Data.state, "this-browser");
        Data.load(theirs);
        await Storage.saveNow(Data.state);
      } else {
        this.downloadBackup(theirs, "account");
      }
      shadow = shadowOf(remote);                    // what's in the account and not kept here is deleted there
    }
    store.set(LINK, uid);
    store.set(SHADOW(uid), shadow);
    Cloud.watch((list) => this.receive(list), (e) => { console.warn(e); this.set("error", "Syncing stopped. Reload the page to try again."); });
    this.set("synced");
    await this.push();
  },

  /** Back after a while (or offline edits): settle every record both ways. */
  settle(remote) {
    stampChanges(Data.state); // edits not saved yet must count with their real time
    const apply = [];
    for (const kind of KINDS) {
      const local = Data.state[kind], theirs = remote[kind] || {};
      const keys = new Set([...Object.keys(local), ...Object.keys(theirs)]);
      for (const key of keys) {
        const d = decide(local[key], theirs[key], shadow[kind + "/" + key]);
        if (d === "apply" || d === "drop") apply.push({ kind, key, data: d === "apply" ? theirs[key] : null });
        if (d === null && theirs[key]) shadow[kind + "/" + key] = { at: theirs[key].updatedAt ?? 0, del: !!theirs[key].deleted };
        if (d === "push") resend(kind, key);
      }
    }
    if (remote.meta && (remote.meta.updatedAt ?? 0) > (shadow.meta?.at ?? 0) && metaText(metaOf(Data.state)) === shadow.meta?.text) {
      apply.push({ kind: "meta", data: remote.meta });
    }
    this.apply(apply);
  },

  /** Changes from another device. */
  receive(list) {
    stampChanges(Data.state); // edits not saved yet must count with their real time
    const apply = [];
    for (const { kind, key, data } of list) {
      if (kind === "meta") {
        const mine = metaText(metaOf(Data.state)) !== shadow.meta?.text; // changed here, not yet sent
        if (!mine && (data.updatedAt ?? 0) > (shadow.meta?.at ?? 0)) apply.push({ kind, data });
        continue;
      }
      const d = decide(Data.state[kind][key], data, shadow[kind + "/" + key]);
      if (d === "apply" || d === "drop") apply.push({ kind, key, data: d === "apply" ? data : null });
      else if (d === null) shadow[kind + "/" + key] = { at: data.updatedAt ?? 0, del: !!data.deleted };
      else if (d === "push") { resend(kind, key); this.changed(); } // ours is newer: the account got an older copy
    }
    this.apply(apply);
  },

  apply(list) {
    if (!list.length) { store.set(SHADOW(uid), shadow); return; }
    Data.applyRemote((s) => {
      for (const { kind, key, data } of list) {
        if (kind === "meta") {
          Object.assign(s, { settings: data.settings, roomTypes: data.roomTypes, flavours: data.flavours, roomsPan: data.roomsPan || s.roomsPan });
          shadow.meta = { text: metaText(data), at: data.updatedAt ?? 0 };
          continue;
        }
        if (data) s[kind][key] = { ...data }; else delete s[kind][key];
        markSeen(kind, key, s[kind][key]);
        shadow[kind + "/" + key] = { at: data?.updatedAt ?? Date.now(), del: !data };
      }
    });
    store.set(SHADOW(uid), shadow);
  },

  /** Called after every local save: send what changed, a moment later. */
  changed() {
    if (!uid || !["synced", "syncing", "offline"].includes(this.status)) return;
    clearTimeout(timer);
    timer = setTimeout(() => this.push(), 1500);
  },

  push() {
    chain = chain.then(() => this.sendChanges()).catch((e) => {
      console.warn("Couldn't sync:", e);
      this.set(navigator.onLine ? "error" : "offline", navigator.onLine ? "Couldn't sync. It will try again with your next change." : null);
    });
    return chain;
  },

  async sendChanges() {
    if (!uid || !["synced", "syncing", "offline", "error"].includes(this.status)) return;
    const writes = [], done = {}, now = Date.now();
    this.tooBig.clear();
    for (const kind of KINDS) {
      const local = Data.state[kind];
      for (const [key, rec] of Object.entries(local)) {
        const sh = shadow[kind + "/" + key];
        if (sh && !sh.del && sh.at === rec.updatedAt) continue;
        if (JSON.stringify(rec).length > MAX_BYTES) { this.tooBig.add(key); continue; }
        writes.push({ kind, key, data: rec });
        done[kind + "/" + key] = { at: rec.updatedAt, del: false };
      }
      for (const [k, sh] of Object.entries(shadow)) {
        if (!k.startsWith(kind + "/") || sh.del || local[k.slice(kind.length + 1)]) continue;
        writes.push({ kind, key: k.slice(kind.length + 1), data: { deleted: true, updatedAt: now } });
        done[k] = { at: now, del: true };
      }
    }
    const text = metaText(metaOf(Data.state));
    if (text !== shadow.meta?.text) {
      writes.push({ kind: "meta", data: { ...metaOf(Data.state), updatedAt: now } });
      done.meta = { text, at: now };
    }
    if (!writes.length) { if (this.status !== "synced") this.set("synced"); return; }
    this.set(navigator.onLine ? "syncing" : "offline");
    await Cloud.write(writes);
    Object.assign(shadow, done);
    store.set(SHADOW(uid), shadow);
    this.set("synced");
  },

  /** Signing out. Unsent changes are sent first (briefly); then keep or remove this browser's copy. */
  async signOut(removeHere) {
    clearTimeout(timer);
    await Promise.race([this.push(), new Promise((r) => setTimeout(r, 4000))]);
    Cloud.unwatch();
    store.set(LINK, null);
    store.set(SHADOW(uid), null);
    uid = null;
    this.set("off");
    if (removeHere) {
      Data.load(emptyState());
      await Storage.saveNow(Data.state);
      for (const id of await Storage.blobs.keys()) await Storage.blobs.remove(id);
      for (const id of await Storage.history.keys().catch(() => [])) await Storage.history.remove(id);
    }
  },

  /** Signed out somewhere else (or the session ended): stop, keep this browser's copy. */
  stop() {
    if (!uid) return;
    clearTimeout(timer);
    Cloud.unwatch();
    uid = null;
    this.set("off");
  },
};

Storage.afterSave = () => Sync.changed();
addEventListener("online", () => Sync.push());
addEventListener("offline", () => { if (Sync.status === "syncing") Sync.set("offline"); });
