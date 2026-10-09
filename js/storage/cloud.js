// Cloud adapter: the signed-in person's records in Firestore.
//   users/{uid}/meta/workspace          version, settings, roomTypes, flavours, roomsPan
//   users/{uid}/rooms/{roomId}
//   users/{uid}/items/{itemId}
//   users/{uid}/layouts/{roomId}__{modeId}
// Each record is its own document (Firestore caps one at 1 MB). A deleted record is
// kept as a small marker { deleted: true, updatedAt } so the deletion syncs too.
// Firestore is loaded from the CDN only once someone is signed in.

import { FIREBASE_VERSION } from "./firebase-config.js";

const KINDS = ["rooms", "items", "layouts"];
export const MAX_BYTES = 900 * 1024; // stay safely under Firestore's 1 MB per record

const docId = (kind, key) => (kind === "layouts" ? key.replace(":", "__") : key);
const keyOf = (kind, id) => (kind === "layouts" ? id.replace("__", ":") : id);

let fs = null, db = null, uid = null, unsubs = [];

export const Cloud = {
  async connect(app, userId) {
    fs = fs || (await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`));
    db = fs.getFirestore(app);
    uid = userId;
  },

  /** Everything in the account: { meta, rooms: { key: rec }, items, layouts }. Markers included. */
  async readAll() {
    const out = { meta: null };
    const meta = await fs.getDoc(fs.doc(db, "users", uid, "meta", "workspace"));
    out.meta = meta.exists() ? meta.data() : null;
    await Promise.all(KINDS.map(async (kind) => {
      const snap = await fs.getDocs(fs.collection(db, "users", uid, kind));
      out[kind] = {};
      snap.docs.forEach((d) => { out[kind][keyOf(kind, d.id)] = d.data(); });
    }));
    return out;
  },

  /** writes: [{ kind: "meta" | "rooms" | "items" | "layouts", key, data }], sent in batches. */
  async write(writes) {
    for (let i = 0; i < writes.length; i += 400) {
      const batch = fs.writeBatch(db);
      for (const w of writes.slice(i, i + 400)) {
        const ref = w.kind === "meta" ? fs.doc(db, "users", uid, "meta", "workspace") : fs.doc(db, "users", uid, w.kind, docId(w.kind, w.key));
        batch.set(ref, w.data);
      }
      await batch.commit();
    }
  },

  /** Call onChange([{ kind, key, data }]) with the changes in each update from the account. */
  watch(onChange, onError) {
    this.unwatch();
    const own = (snap) => snap.metadata?.hasPendingWrites;
    unsubs.push(fs.onSnapshot(fs.doc(db, "users", uid, "meta", "workspace"), (snap) => {
      if (!own(snap) && snap.exists()) onChange([{ kind: "meta", key: "workspace", data: snap.data() }]);
    }, onError));
    for (const kind of KINDS) {
      unsubs.push(fs.onSnapshot(fs.collection(db, "users", uid, kind), (snap) => {
        if (own(snap)) return;
        const list = snap.docChanges().filter((ch) => ch.type !== "removed").map((ch) => ({ kind, key: keyOf(kind, ch.doc.id), data: ch.doc.data() }));
        if (list.length) onChange(list);
      }, onError));
    }
  },
  unwatch() { unsubs.forEach((u) => u()); unsubs = []; },
};
