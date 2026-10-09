// Workspace adapter: the browser's IndexedDB (no ~5 MB limit).
// Adapter contract: load() -> Promise<state | null>, save(state) -> Promise<true | false>.
//
// The first time it runs it moves the workspace over from localStorage: write it here,
// read it back to check, and only then remove the old copy. If IndexedDB can't be
// used at all, it keeps using localStorage, as Creation always did.

import { run } from "./idb.js";
import { LocalWorkspace } from "./local.js";

const KEY = "current";
let fallback = false;

async function moveFromLocal() {
  const old = LocalWorkspace.load();
  if (!old) return null;
  await run("workspace", "readwrite", (s) => s.put({ savedAt: Date.now(), state: old }, KEY));
  const back = await run("workspace", "readonly", (s) => s.get(KEY));
  if (JSON.stringify(back?.state) !== JSON.stringify(old)) throw new Error("The moved workspace didn't read back the same.");
  LocalWorkspace.forget();
  return old;
}

export const IdbWorkspace = {
  async load() {
    try {
      const rec = await run("workspace", "readonly", (s) => s.get(KEY));
      return rec?.state ?? (await moveFromLocal());
    } catch (e) {
      console.warn("Using this browser's older storage instead of IndexedDB:", e);
      fallback = true;
      return LocalWorkspace.load();
    }
  },
  async save(state) {
    if (fallback) return LocalWorkspace.save(state);
    try {
      await run("workspace", "readwrite", (s) => s.put({ savedAt: Date.now(), state }, KEY));
      return true;
    } catch (e) {
      console.error("Couldn't save the workspace:", e);
      return false;
    }
  },
};
