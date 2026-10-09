// Small feedback pieces: the save-status indicator and the undo toast.
import { h } from "../core/dom.js";
import { Storage } from "../storage/storage.js";

const STATUS = {
  saved: ["Saved in this browser", ""],
  saving: ["Saving…", "busy"],
  error: ["Couldn't save: browser storage is full", "warn"],
};

export function statusEl() {
  const [text, cls] = STATUS[Storage.status] || STATUS.saved;
  return h("span", { class: "status " + cls, "data-status": "" }, h("i"), text);
}
export function refreshStatus() {
  document.querySelectorAll("[data-status]").forEach((el) => el.replaceWith(statusEl()));
}

let timer = null;
export const Toast = {
  show(message, undo) {
    const root = document.getElementById("toast-root");
    clearTimeout(timer);
    root.replaceChildren(h("div", { class: "toast", role: "status" },
      h("span", {}, message),
      undo && h("button", { onclick: () => { undo(); root.replaceChildren(); } }, "Undo")));
    timer = setTimeout(() => root.replaceChildren(), 6000);
  },
};
