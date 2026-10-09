// Backups: download everything (including images and item history) as one file, or import one.

import { h } from "../core/dom.js";
import { Data } from "../data/store.js";
import { migrate, emptyState } from "../data/migrations.js";
import { sampleWorkspace } from "../data/sample.js";
import { Storage } from "../storage/storage.js";
import { UI } from "./state.js";

const toDataURL = (blob) => new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); });

async function exportFile() {
  const blobs = {};
  for (const it of Object.values(Data.state.items)) {
    if (it.format !== "image" || !it.content?.blob) continue;
    const b = await Storage.blobs.get(it.content.blob);
    if (b) blobs[it.content.blob] = await toDataURL(b);
  }
  const all = await Storage.history.all().catch(() => ({}));
  const history = Object.fromEntries(Object.entries(all).filter(([id]) => Data.state.items[id]));
  const file = new Blob([JSON.stringify({ app: "creation", exportedAt: new Date().toISOString(), state: Data.state, blobs, history })], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(file), download: `creation-backup-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

async function importFile(file, msg) {
  try {
    const parsed = JSON.parse(await file.text());
    const state = migrate(parsed.state ?? parsed);
    if (!state) throw new Error("not-creation");
    for (const [id, url] of Object.entries(parsed.blobs || {})) {
      await Storage.blobs.put(await (await fetch(url)).blob(), id);
    }
    for (const [id, versions] of Object.entries(parsed.history || {})) {
      if (state.items[id] && Array.isArray(versions)) await Storage.history.put(id, versions);
    }
    state.sample = false;
    Data.load(state);
    Storage.saveNow(state);
    UI.selection = null;
    UI.go("rooms");
  } catch (e) {
    msg.textContent = e.message === "not-creation" || e instanceof SyntaxError
      ? "That file isn't a Creation backup. Choose a file you saved with Download backup."
      : e.message;
    msg.classList.add("error");
  }
}

export function dataPanel() {
  const msg = h("p", { class: "help" });
  const file = h("input", { type: "file", accept: "application/json,.json", hidden: true, id: "import-file",
    onchange: () => file.files[0] && importFile(file.files[0], msg) });
  const replace = (state, label) => Data.commit((s) => { Object.keys(s).forEach((k) => delete s[k]); Object.assign(s, state); }, label);
  return h("div", { class: "group" },
    h("p", { class: "help" }, "Your workspace is saved in this browser. Download a backup now and then; it includes your images and the history of your items."),
    h("div", { class: "row" },
      h("button", { class: "btn primary", onclick: exportFile }, "Download backup"),
      h("button", { class: "btn", onclick: () => file.click() }, "Import backup…"), file),
    msg,
    h("h5", {}, "Start over"),
    h("div", { class: "row" },
      h("button", { class: "btn", onclick: () => { replace(sampleWorkspace(), "Loaded the sample workspace"); UI.go("rooms"); } }, "Load sample"),
      h("button", { class: "btn danger", onclick: () => { replace(emptyState(), "Cleared the workspace"); UI.go("rooms"); } }, "Start empty")),
    h("p", { class: "help" }, "Both can be undone straight away from the message that appears."));
}
