// Storage facade: the only file the rest of the app talks to about saving.
// Swap the adapters imported here to change where data lives.

import { IdbWorkspace as Workspace } from "./workspace-idb.js";
import { Blobs } from "./blobs.js";
import { HistoryStore } from "./history-store.js";

export const Storage = {
  status: "saved", // "saved" | "saving" | "error"
  onStatus: () => {},
  blobs: Blobs,
  history: HistoryStore,
  timer: null,
  pending: null, // the state waiting to be saved
  chain: Promise.resolve(),
  /** Set by the data layer: runs just before each save (stamps changed records). */
  beforeSave: null,

  /** Resolves with the saved workspace, or null on a first visit. */
  load() {
    return Workspace.load();
  },
  scheduleSave(state) {
    this.pending = state;
    this.setStatus("saving");
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.saveNow(state), 500);
  },
  /** Saves run one after another, so an older save can never land after a newer one. */
  saveNow(state) {
    clearTimeout(this.timer);
    this.pending = null;
    this.beforeSave?.(state);
    this.chain = this.chain.then(() => Workspace.save(state)).then((ok) => {
      if (!this.pending) this.setStatus(ok ? "saved" : "error");
    });
    return this.chain;
  },
  /** Save straight away if a save is waiting (the tab is being hidden or closed). */
  flush() {
    if (this.pending) this.saveNow(this.pending);
  },
  setStatus(s) {
    this.status = s;
    this.onStatus(s);
  },
};

addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") Storage.flush(); });
addEventListener("pagehide", () => Storage.flush());
