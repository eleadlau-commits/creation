// Item history: past versions of an item's title, note, sources and origin
// (never image files). Stored apart from the workspace (Storage.history) and only
// read when someone opens an item's details.
//
// A version is recorded when an edit is finished. Edits within 5 minutes of the
// last recorded one merge into it. The first version is how the item looked before
// its first edit, and is never merged away. At most 50 versions per item.

import { Storage } from "../storage/storage.js";

const MERGE_MS = 5 * 60 * 1000;
const MAX = 50;
const listeners = new Set();
let queue = Promise.resolve();

/** The part of an item that history keeps. */
export function snapshot(it) {
  return {
    title: it.format === "image" ? it.title ?? "" : String(it.content ?? ""),
    note: it.note ?? "",
    sources: (it.sources || []).map((s) => ({ ...s })),
    origin: { at: it.origin?.at ?? null, context: it.origin?.context ?? "" },
  };
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const content = ({ title, note, sources, origin }) => ({ title, note, sources, origin });

export const History = {
  /** Watch for new versions: fn(itemId). */
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** Record a finished edit. before/after are the item before and after the change. */
  record(before, after, { merge = true } = {}) {
    const was = snapshot(before), now = snapshot(after);
    if (same(was, now)) return queue;
    const id = after.id;
    queue = queue.then(async () => {
      const versions = await Storage.history.get(id);
      if (!versions.length) versions.push({ at: before.createdAt || Date.now(), first: true, ...was });
      const last = versions[versions.length - 1];
      const t = Date.now();
      if (merge && !last.first && t - last.at < MERGE_MS) versions[versions.length - 1] = { at: t, ...now };
      else versions.push({ at: t, ...now });
      // An edit that ends up where the version before it was adds nothing.
      if (versions.length > 1 && same(content(versions.at(-1)), content(versions.at(-2)))) versions.pop();
      while (versions.length > MAX) versions.splice(versions[0].first && versions.length > 1 ? 1 : 0, 1);
      await Storage.history.put(id, versions);
      listeners.forEach((fn) => fn(id));
    }).catch((e) => console.warn("Couldn't record this change in the item's history:", e));
    return queue;
  },

  /** Versions of an item, oldest first. */
  list(id) { return queue.then(() => Storage.history.get(id)).catch(() => []); },

  /** The fields to write back to an item to bring back a version. */
  patchFor(item, version) {
    const fields = { note: version.note, sources: version.sources.map((s) => ({ ...s })), origin: { ...version.origin } };
    return item.format === "image" ? { ...fields, title: version.title } : { ...fields, content: version.title };
  },
};
