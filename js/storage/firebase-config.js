// Firebase settings for signing in (and, later, syncing to the account).
// These web config values are public by design: anyone loading the site can see them.
// What keeps each person's data private is the security rules (firestore.rules,
// storage.rules), which you paste into the Firebase console. See docs/firebase-setup.md.
//
// To switch accounts off entirely, set firebaseConfig to null.

/** Firebase is loaded from Google's CDN at this exact version. Change it on purpose only. */
export const FIREBASE_VERSION = "12.19.0";

export const firebaseConfig = {
  apiKey: "AIzaSyAQvHtaHfJ6CrrGFtZycib619A3I2WWQ6M",
  authDomain: "creation-ba12c.firebaseapp.com",
  projectId: "creation-ba12c",
  storageBucket: "creation-ba12c.firebasestorage.app",
  messagingSenderId: "162781622736",
  appId: "1:162781622736:web:49031c5caf31c305bc09d5",
};
