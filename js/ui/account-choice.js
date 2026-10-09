// The two questions syncing asks: which version to keep on first sign-in (when this
// browser and the account differ), and what to do with this browser's copy on sign-out.

import { h } from "../core/dom.js";

function dialog(title, text, choices) {
  return new Promise((resolve) => {
    const close = (v) => { root.remove(); resolve(v); };
    const root = h("div", { class: "dialog-back", role: "dialog", "aria-modal": "true", "aria-labelledby": "dlg-title" },
      h("div", { class: "dialog" },
        h("h3", { id: "dlg-title" }, title),
        text.map((t) => h("p", {}, t)),
        h("div", { class: "dialog-actions" }, choices.map(([value, label, cls]) =>
          h("button", { class: "btn " + (cls || ""), "data-choice": value, onclick: () => close(value) }, label)))));
    document.body.append(root);
    root.querySelector(".btn.primary")?.focus();
  });
}

/** First sign-in and the account already holds different work. Resolves "account" or "browser". */
export const askWhichToKeep = () => dialog("Your account already has work in it",
  ["It's different from what's in this browser. Which one should Creation use from now on?",
    "The one you don't keep is downloaded as a backup file, so nothing is lost."],
  [["account", "Keep the account's version", "primary"], ["browser", "Replace it with this browser's"]]);

/** Signing out. Resolves "keep", "remove", or null (cancel). */
export const askSignOut = () => dialog("Sign out",
  ["Your work stays in your account. What should happen to the copy in this browser?"],
  [["keep", "Keep a copy on this device", "primary"], ["remove", "Remove from this device", "danger"], [null, "Cancel", "ghost"]]);
