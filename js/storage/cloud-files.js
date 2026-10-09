// Cloud files adapter: the signed-in person's image files in Cloud Storage,
// at users/{uid}/blobs/{blobId}. Loaded from the CDN only once someone is signed in.

import { FIREBASE_VERSION } from "./firebase-config.js";

let st = null, storage = null, uid = null;
const ref = (id) => st.ref(storage, `users/${uid}/blobs/${id}`);

export const CloudFiles = {
  async connect(app, userId) {
    st = st || (await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-storage.js`));
    storage = st.getStorage(app);
    uid = userId;
  },
  upload: (id, blob) => st.uploadBytes(ref(id), blob, { contentType: blob.type || "image/png" }),
  /** The file, or null if the account doesn't have it. Throws if the browser may not download it (CORS). */
  async download(id) {
    try { return await st.getBlob(ref(id)); }
    catch (e) { if (e?.code === "storage/object-not-found") return null; throw e; }
  },
  /** A web address for showing the file (works even where downloading isn't allowed). */
  url: (id) => st.getDownloadURL(ref(id)).catch(() => null),
  /** Every file in the account: [{ id, created (ms) }]. */
  async list() {
    const res = await st.listAll(st.ref(storage, `users/${uid}/blobs`));
    return Promise.all(res.items.map(async (it) => ({ id: it.name, created: Date.parse((await st.getMetadata(it)).timeCreated) || 0 })));
  },
  remove: (id) => st.deleteObject(ref(id)),
};
