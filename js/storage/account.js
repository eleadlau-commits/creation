// Signing in and out (Firebase Auth: Google, or a link sent by email).
// Firebase is only loaded when someone opens the Account tab, comes back from an
// email link, or was signed in last time, so the site stays light for everyone else.
//
// Account.state = { status, user, error, needsEmail }
//   status: "off" (no config) | "idle" (not loaded) | "loading" | "signed-out" | "signed-in"
//   user:   { name, email } when signed in

import { firebaseConfig, FIREBASE_VERSION } from "./firebase-config.js";

const HINT = "creation.signedIn";      // remembered so a signed-in person loads Firebase at once
const EMAIL = "creation.emailForSignIn"; // the address a sign-in link was sent to
const sdk = (name) => import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-${name}.js`);
const remember = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } };
const recall = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

let auth = null, fb = null, loading = null;
const listeners = new Set();

const MESSAGES = {
  "auth/popup-closed-by-user": "The sign-in window was closed before finishing.",
  "auth/unauthorized-domain": "This website isn't allowed to sign in yet. Add its address under Authentication → Settings → Authorised domains in Firebase.",
  "auth/operation-not-allowed": "This way of signing in isn't switched on yet in Firebase (Authentication → Sign-in method).",
  "auth/invalid-email": "That doesn't look like an email address.",
  "auth/invalid-action-code": "That sign-in link has expired or was already used. Ask for a new one.",
  "auth/network-request-failed": "Couldn't reach the sign-in service. Check the internet connection.",
};
const friendly = (e) => MESSAGES[e?.code] || "Signing in didn't work: " + (e?.message || e);

export const Account = {
  state: { status: firebaseConfig ? "idle" : "off", user: null, error: null, needsEmail: false, linkSent: null },
  subscribe(fn) { listeners.add(fn); },
  set(patch) { Object.assign(this.state, patch); listeners.forEach((fn) => fn(this.state)); },

  /** Load Firebase now if this visit needs it (signed in last time, or an email link). */
  start() {
    if (this.state.status === "off") return;
    if (recall(HINT) || this.isEmailLink()) this.load();
  },
  isEmailLink: () => /[?&]mode=signIn\b/.test(location.search) && /[?&]oobCode=/.test(location.search),

  load() {
    if (this.state.status === "off") return Promise.resolve();
    if (!loading) {
      this.set({ status: "loading", error: null });
      loading = (async () => {
        const [app, a] = await Promise.all([sdk("app"), sdk("auth")]);
        fb = a;
        auth = a.getAuth(app.initializeApp(firebaseConfig));
        a.onAuthStateChanged(auth, (u) => {
          remember(HINT, u ? "1" : null);
          this.set({ status: u ? "signed-in" : "signed-out", user: u ? { name: u.displayName || "", email: u.email || "" } : null });
        });
        if (this.isEmailLink()) await this.finishEmailLink(recall(EMAIL));
      })().catch((e) => {
        loading = null;
        this.set({ status: "signed-out", error: "Couldn't load the sign-in service. Check the internet connection and try again." });
        console.warn(e);
      });
    }
    return loading;
  },

  async signInWithGoogle() {
    await this.load();
    this.set({ error: null });
    const provider = new fb.GoogleAuthProvider();
    try { await fb.signInWithPopup(auth, provider); }
    catch (e) {
      if (e?.code === "auth/popup-blocked") return fb.signInWithRedirect(auth, provider);
      if (e?.code !== "auth/cancelled-popup-request") this.set({ error: friendly(e) });
    }
  },

  async sendEmailLink(email) {
    await this.load();
    this.set({ error: null, linkSent: null });
    try {
      await fb.sendSignInLinkToEmail(auth, email, { url: location.origin + location.pathname, handleCodeInApp: true });
      remember(EMAIL, email);
      this.set({ linkSent: email });
    } catch (e) { this.set({ error: friendly(e) }); }
  },

  /** Back from the email link. Without the address (another browser), ask for it first. */
  async finishEmailLink(email) {
    if (!email) { this.set({ needsEmail: true }); return; }
    try {
      await fb.signInWithEmailLink(auth, email, location.href);
      remember(EMAIL, null);
      this.set({ needsEmail: false, linkSent: null });
      history.replaceState(null, "", location.pathname);
    } catch (e) { this.set({ error: friendly(e), needsEmail: false }); history.replaceState(null, "", location.pathname); }
  },

  async signOut() {
    if (!auth) return;
    await fb.signOut(auth);
  },
};
