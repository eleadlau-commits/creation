// Blob adapter: image files, kept in the browser's IndexedDB.
// Items only store a blob id; the file itself lives here.
// Contract: put(blob, id?) -> id, get(id) -> Blob | null, remove(id), keys() -> ids, urlFor(id) -> object URL | null.

import { uid } from "../core/dom.js";

const DB_NAME = "creation-files";
const STORE = "blobs";
let dbPromise = null;
const urls = new Map();

function db() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function tx(mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  });
}

export const Blobs = {
  async put(blob, id = uid("blob")) {
    await tx("readwrite", (s) => s.put(blob, id));
    return id;
  },
  async get(id) {
    try { return (await tx("readonly", (s) => s.get(id))) || null; } catch { return null; }
  },
  async remove(id) {
    if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
    await tx("readwrite", (s) => s.delete(id));
  },
  async keys() {
    try { return (await tx("readonly", (s) => s.getAllKeys())) || []; } catch { return []; }
  },
  async urlFor(id) {
    if (urls.has(id)) return urls.get(id);
    const blob = await this.get(id);
    if (!blob) return null;
    const u = URL.createObjectURL(blob);
    urls.set(id, u);
    return u;
  },
};
