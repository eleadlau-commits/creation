// Settings → Account: sign in with Google or an email link, see who is signed in, sign out.
// Opening this tab is what loads the sign-in service for someone who isn't signed in.

import { h } from "../core/dom.js";
import { Account } from "../storage/account.js";
import { Sync } from "../data/sync.js";
import { askSignOut } from "./account-choice.js";

const WHAT = "Signed in, your work is saved to your account and kept the same on every device where you sign in. This browser keeps a copy, so it also works offline. Images and item history are kept in your account too.";
const SYNC = { connecting: "Connecting to your account…", syncing: "Syncing…", synced: "Everything is synced to your account.", offline: "Offline. Changes will sync when you're back online.", error: "" };

async function signOut() {
  const choice = await askSignOut();
  if (!choice) return;
  await Sync.signOut(choice === "remove");
  await Account.signOut();
}

export function accountPanel() {
  const s = Account.state;
  if (s.status === "off") return h("p", { class: "help" }, "Accounts aren't set up for this copy of Creation.");
  if (s.status === "idle") queueMicrotask(() => Account.load());
  const error = s.error && h("p", { class: "help error", role: "alert" }, s.error);

  if (s.status === "idle" || s.status === "loading") return h("div", { class: "group" }, h("p", { class: "help" }, "Loading sign-in…"), error);

  if (s.status === "signed-in") {
    return h("div", { class: "group" },
      h("p", {}, "Signed in as ", h("b", {}, s.user.name || s.user.email), s.user.name && s.user.email ? ` (${s.user.email})` : ""),
      h("p", { class: "help", id: "sync-state" }, Sync.error || SYNC[Sync.status] || ""),
      h("p", { class: "help" }, WHAT),
      h("div", { class: "row" }, h("button", { class: "btn", id: "sign-out", onclick: signOut }, "Sign out")),
      error);
  }

  if (s.needsEmail) {
    const email = h("input", { type: "text", id: "confirm-email", placeholder: "you@example.com", autocomplete: "email", "aria-label": "Your email address" });
    return h("div", { class: "group" },
      h("p", {}, "To finish signing in, type the email address the link was sent to."),
      email,
      h("div", { class: "row" }, h("button", { class: "btn primary", onclick: () => email.value.trim() && Account.finishEmailLink(email.value.trim()) }, "Finish signing in")),
      error);
  }

  const email = h("input", { type: "text", id: "sign-in-email", placeholder: "you@example.com", autocomplete: "email", "aria-label": "Your email address",
    onkeydown: (e) => { if (e.key === "Enter") send(); } });
  const send = () => { const v = email.value.trim(); if (v) Account.sendEmailLink(v); };
  return h("div", { class: "group" },
    h("p", { class: "help" }, "Signing in is optional. Without it, Creation works as always and keeps your work in this browser."),
    h("div", { class: "row" }, h("button", { class: "btn primary", id: "sign-in-google", onclick: () => Account.signInWithGoogle() }, "Sign in with Google")),
    h("h5", {}, "Or with your email"),
    s.linkSent
      ? h("p", {}, `We sent a sign-in link to ${s.linkSent}. Open it in this browser to finish. It may take a minute, and can land in spam.`)
      : [email, h("div", { class: "row" }, h("button", { class: "btn", id: "send-link", onclick: send }, "Email me a sign-in link"))],
    h("p", { class: "help" }, WHAT),
    error);
}
