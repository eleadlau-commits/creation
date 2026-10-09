// A small IndexedDB helper shared by the workspace and history adapters.
// One database, "creation", with an object store per kind of record.

const DB_NAME = "creation";
const STORES = ["workspace", "history"];
let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("The browser's database is busy in another tab."));
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

/** Run one request on a store; resolves with its result once the transaction completes. */
export async function run(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    let req;
    try { req = fn(t.objectStore(store)); } catch (e) { reject(e); return; }
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error("Saving was cancelled by the browser."));
  });
}

/** Every key and value of a store, as { key: value }. */
export async function entries(store) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const out = {};
    const req = db.transaction(store, "readonly").objectStore(store).openCursor();
    req.onsuccess = () => { const c = req.result; if (!c) { resolve(out); return; } out[c.key] = c.value; c.continue(); };
    req.onerror = () => reject(req.error);
  });
}
