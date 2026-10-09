// The single source of truth. Every change goes through Data.commit().
// Listeners re-render; storage saves after a short pause.

import { Storage } from "../storage/storage.js";
import { resetStamps, stampChanges } from "./stamps.js";

Storage.beforeSave = stampChanges;

export const Data = {
  state: null,
  undoSnap: null,
  listeners: new Set(),
  /** Set by the UI: shows an "Undo" toast. */
  onUndoable: () => {},

  /** Replace the whole state (boot, import, reset). */
  load(state) {
    this.state = state;
    resetStamps(state);
    this.undoSnap = null;
    this.emit(true);
  },
  subscribe(fn) {
    this.listeners.add(fn);
  },
  /** replaced = true when the whole state was swapped out. */
  emit(replaced = false) {
    for (const fn of this.listeners) fn(replaced);
  },
  /** Change the state. Pass undoLabel to make the change undoable. */
  commit(fn, undoLabel) {
    if (undoLabel) this.undoSnap = JSON.stringify(this.state);
    fn(this.state);
    this.emit();
    Storage.scheduleSave(this.state);
    if (undoLabel) this.onUndoable(undoLabel, () => this.undo());
  },
  /** Save without re-rendering (panning, live dragging already shown on screen). */
  quiet(fn) {
    if (fn) fn(this.state);
    Storage.scheduleSave(this.state);
  },
  undo() {
    if (!this.undoSnap) return;
    this.state = JSON.parse(this.undoSnap);
    this.undoSnap = null;
    this.emit(true);
    Storage.scheduleSave(this.state);
  },
};
