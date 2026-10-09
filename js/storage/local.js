// Workspace adapter: browser localStorage. Used before Creation moved to IndexedDB,
// and still used as a fallback where IndexedDB isn't available.
// Adapter contract: load() -> state | null, save(state) -> true | false.
// To store the workspace somewhere else (your own server), write another
// adapter with the same two functions and import it in storage.js instead.

const KEY = "creation.workspace";

export const LocalWorkspace = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw).state : null;
    } catch {
      return null;
    }
  },
  /** Remove the old copy once the workspace has safely moved elsewhere. */
  forget() {
    try { localStorage.removeItem(KEY); } catch { /* nothing to remove */ }
  },
  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), state }));
      return true;
    } catch {
      return false;
    }
  },
};
