// Syncing image files with the account (Cloud Storage), alongside data/sync.js.
// A file is uploaded before the item that uses it is sent, so other devices never
// get an item whose picture isn't there yet. Files that arrive are kept in this
// browser too, so they show offline. Unused files are tidied away after a day.

import { Data } from "./store.js";
import { Storage } from "../storage/storage.js";
import { CloudFiles } from "../storage/cloud-files.js";

const DAY = 24 * 60 * 60 * 1000;
const KEY = (uid) => "creation.syncFiles." + uid; // ids of files known to be in the account
const save = (uid, set) => { try { set ? localStorage.setItem(KEY(uid), JSON.stringify([...set])) : localStorage.removeItem(KEY(uid)); } catch { /* full or private */ } };
const blobIds = (state) => new Set(Object.values(state.items).filter((i) => i.format === "image" && i.content?.blob).map((i) => i.content.blob));

const RETRY_MS = 20000, RETRIES = 30; // a missing picture may still be on its way: look again for ~10 minutes
let uid = null, ready = false, uploaded = new Set(), retryTimer = null, retries = 0;
const shown = new Map(); // files shown from the account where downloading isn't allowed (CORS not set up)

export const SyncFiles = {
  async connect(app, userId) {
    uid = userId;
    try { uploaded = new Set(JSON.parse(localStorage.getItem(KEY(uid)) || "[]")); } catch { uploaded = new Set(); }
    try { await CloudFiles.connect(app, uid); ready = true; }
    catch (e) { ready = false; console.warn("Images won't sync (Cloud Storage isn't available):", e); }
  },

  /** Make sure a file is in the account. false if it couldn't be uploaded (try again later). */
  async ensure(id) {
    if (!ready) return true; // without Storage, items still sync; their pictures stay local
    if (uploaded.has(id)) return true;
    const blob = await Storage.blobs.get(id);
    if (!blob) return true; // not here: it came from another device, which uploaded it
    try {
      await CloudFiles.upload(id, blob);
      uploaded.add(id); save(uid, uploaded);
      return true;
    } catch (e) { console.warn("Couldn't upload an image:", e); return false; }
  },

  /** Upload every picture in this browser that the account may not have yet
   *  (for example images whose items were synced before pictures were). */
  async uploadMissing() {
    if (!ready) return;
    const here = new Set(await Storage.blobs.keys());
    for (const id of blobIds(Data.state)) if (here.has(id) && !uploaded.has(id)) await this.ensure(id);
  },

  /** Download the pictures of image items that arrived from other devices. */
  async fetchMissing({ retry = false } = {}) {
    if (!ready) return;
    if (!retry) retries = 0;
    clearTimeout(retryTimer);
    const here = new Set(await Storage.blobs.keys());
    let got = false, missing = 0;
    for (const id of blobIds(Data.state)) {
      if (here.has(id) || shown.has(id)) continue;
      try {
        const blob = await CloudFiles.download(id);
        if (blob) { await Storage.blobs.put(blob, id); uploaded.add(id); got = true; }
      } catch {
        const url = await CloudFiles.url(id); // the bucket doesn't allow downloads from this site: show it online only
        if (url) { shown.set(id, url); got = true; }
      }
      if (!(await Storage.blobs.get(id)) && !shown.has(id)) missing++;
    }
    save(uid, uploaded);
    if (got) Data.emit();
    if (missing && ready && retries++ < RETRIES) retryTimer = setTimeout(() => this.fetchMissing({ retry: true }), RETRY_MS);
  },

  /** Remove files from the account that no item uses, once they are more than a day old. */
  async tidy() {
    if (!ready) return;
    try {
      const used = blobIds(Data.state);
      for (const f of await CloudFiles.list()) {
        if (used.has(f.id) || Date.now() - f.created < DAY) continue;
        await CloudFiles.remove(f.id);
        uploaded.delete(f.id);
      }
      save(uid, uploaded);
    } catch (e) { console.warn("Couldn't tidy images in the account:", e); }
  },

  /** Signed out: forget what this browser knew about the account's files. */
  reset() { clearTimeout(retryTimer); if (uid) save(uid, null); uid = null; ready = false; uploaded = new Set(); shown.clear(); },
};

Storage.blobs.remoteUrl = (id) => shown.get(id) || null;
