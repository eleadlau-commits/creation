// History adapter: past versions of items, kept in IndexedDB apart from the workspace,
// so opening a room never reads them. Records are keyed by item id.
// Contract: get(id) -> versions[], put(id, versions), remove(id), keys() -> ids, all() -> { id: versions }.

import { run, entries } from "./idb.js";

export const HistoryStore = {
  async get(id) { return (await run("history", "readonly", (s) => s.get(id))) || []; },
  put: (id, versions) => run("history", "readwrite", (s) => s.put(versions, id)),
  remove: (id) => run("history", "readwrite", (s) => s.delete(id)),
  keys: async () => (await run("history", "readonly", (s) => s.getAllKeys())) || [],
  all: () => entries("history"),
};
