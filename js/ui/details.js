// The item details panel: title, note, sources, origin and history of one text or image item.
// It lives in its own root (#details-root) so redrawing the room never takes the
// focus away from a field being typed in. Changes are saved when a field is left.

import { h, uid } from "../core/dom.js";
import { formatOf } from "../core/registry.js";
import { Query, Act } from "../data/actions.js";
import { UI } from "./state.js";
import { historySection } from "./history-list.js";

const root = () => document.getElementById("details-root");
/** Always read the item fresh: the panel isn't redrawn while someone types in it. */
const now = (id) => Query.item(id);
/** Save a change made in the panel. The panel already shows it, so it isn't redrawn. */
let saving = false;
function save(id, patch) {
  saving = true;
  try { Act.updateItem(id, patch); } finally { saving = false; }
}
const typingHere = () => root()?.contains(document.activeElement) && document.activeElement !== document.body;

export function openDetails(id) {
  UI.details = id;
  UI.drawer.open = false;
  UI.renderDrawer();
  renderDetails(true);
  document.getElementById("d-title")?.focus();
}
export function closeDetails() {
  if (!UI.details) return;
  UI.details = null;
  renderDetails(true);
}

/** Link text people type ("example.com") becomes a safe web address. */
const webAddress = (url) => (/^https?:\/\//i.test(url) ? url : "https://" + url.replace(/^[a-z]+:/i, ""));

function field(label, control, hint) {
  return h("label", { class: "d-field" }, h("span", { class: "d-label" }, label), control, hint && h("span", { class: "help" }, hint));
}

function sourceRow(it, src, i) {
  const set = (patch) => save(it.id, { sources: now(it.id).sources.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const input = (key, placeholder, extra = {}) => h("input", { type: "text", value: src[key] || "", placeholder, "aria-label": placeholder, ...extra,
    onchange: (e) => set({ [key]: e.target.value.trim() }) });
  return h("li", { class: "d-source" },
    input("label", "Source, e.g. a book or a person", { id: `d-src-${i}`, class: "d-src-label" }),
    h("div", { class: "d-src-row" },
      input("url", "Link (optional)", { class: "d-src-url" }),
      input("locator", "Where, e.g. p. 48", { class: "d-src-loc" }),
      src.url && h("a", { class: "btn ghost", href: webAddress(src.url), target: "_blank", rel: "noopener noreferrer", title: "Open the link" }, "↗"),
      h("button", { class: "btn ghost", title: "Remove this source", "aria-label": "Remove this source",
        onclick: () => { save(it.id, { sources: now(it.id).sources.filter((_, j) => j !== i) }); renderDetails(true); } }, "×")));
}

function panel(it) {
  const isText = formatOf(it).id === "text";
  const origin = it.origin || { at: null, context: "" };
  const title = h("input", { type: "text", id: "d-title", value: isText ? it.content : it.title || "",
    onchange: (e) => {
      const v = e.target.value.trim();
      if (!v) { e.target.value = isText ? now(it.id).content : now(it.id).title; return; }
      save(it.id, isText ? { content: v } : { title: v });
    },
    onkeydown: (e) => { if (e.key === "Enter") e.target.blur(); } });
  const note = h("textarea", { id: "d-note", rows: 7, placeholder: "Anything longer: thoughts, quotes, what it reminds you of.",
    onchange: (e) => save(it.id, { note: e.target.value.replace(/\s+$/, "") }) });
  note.value = it.note || "";
  const addSource = () => {
    save(it.id, { sources: [...(now(it.id).sources || []), { id: uid("src"), label: "", url: "", locator: "" }] });
    renderDetails(true);
    document.getElementById(`d-src-${Query.item(it.id).sources.length - 1}`)?.focus();
  };
  return h("aside", { class: "details", "aria-label": "Item details", onkeydown: (e) => { if (e.key === "Escape") { e.stopPropagation(); closeDetails(); } } },
    h("div", { class: "drawer-head" }, h("h3", {}, "Details"),
      h("button", { class: "btn ghost", onclick: closeDetails, "aria-label": "Close details" }, "Close")),
    h("div", { class: "drawer-body" },
      field("Title", title),
      field("Note", note),
      h("div", { class: "group" }, h("h5", {}, "Sources"),
        (it.sources || []).length ? h("ul", { class: "d-sources" }, it.sources.map((s, i) => sourceRow(it, s, i)))
          : h("p", { class: "help" }, "Where this came from: a book, a conversation, a page."),
        h("div", { class: "row" }, h("button", { class: "btn", id: "d-add-source", onclick: addSource }, "Add source"))),
      h("div", { class: "group" }, h("h5", {}, "Origin"),
        field("When it first came to you", h("input", { type: "date", id: "d-origin-at", value: origin.at || "",
          onchange: (e) => save(it.id, { origin: { ...now(it.id).origin, at: e.target.value || null } }) })),
        field("Where or how", h("input", { type: "text", id: "d-origin-context", value: origin.context || "", placeholder: "e.g. on a walk",
          onchange: (e) => save(it.id, { origin: { ...now(it.id).origin, context: e.target.value.trim() } }) }))),
      historySection(it.id, () => renderDetails(true)),
      h("p", { class: "help" }, "Added " + new Date(it.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }))));
}

/** Redraw the panel. Skipped while someone is typing in it, unless forced. */
export function renderDetails(force = false) {
  const el = root();
  if (!el) return;
  const it = UI.details && UI.screen === "room" ? Query.item(UI.details) : null;
  if (!it || it.format === "room") { UI.details = null; el.replaceChildren(); return; }
  if (!force && (saving || typingHere())) return;
  el.replaceChildren(panel(it));
}
