// Storage facade: the only file the rest of the app talks to about saving.
// Swap the adapters imported here to change where data lives.

import { LocalWorkspace as Workspace } from "./local.js";
import { Blobs } from "./blobs.js";

export const Storage = {
  status: "saved", // "saved" | "saving" | "error"
  onStatus: () => {},
  blobs: Blobs,
  timer: null,

  load() {
    return Workspace.load();
  },
  scheduleSave(state) {
    this.setStatus("saving");
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.saveNow(state), 500);
  },
  saveNow(state) {
    clearTimeout(this.timer);
    this.setStatus(Workspace.save(state) ? "saved" : "error");
  },
  setStatus(s) {
    this.status = s;
    this.onStatus(s);
  },
};
