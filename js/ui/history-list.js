// The History section of the details panel. Versions are loaded only when the
// panel opens, and the list refreshes itself when a new version is recorded.

import { h, trunc } from "../core/dom.js";
import { Query, Act } from "../data/actions.js";
import { History, snapshot } from "../data/history.js";

const when = (t) => {
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleString(undefined, { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }), hour: "2-digit", minute: "2-digit" });
};
const sameContent = (current, v) => JSON.stringify(current) === JSON.stringify({ title: v.title, note: v.note, sources: v.sources, origin: v.origin });

function versionRow(itemId, v, isCurrent, onRestore) {
  const firstLine = v.note.split("\n")[0];
  return h("li", { class: "d-version" + (isCurrent ? " current" : "") },
    h("div", { class: "d-version-head" },
      h("span", { class: "d-when" }, v.first ? "Before your first edit · " + when(v.at) : when(v.at)),
      isCurrent ? h("span", { class: "d-now" }, "Now")
        : h("button", { class: "btn ghost", onclick: () => { Act.restoreVersion(itemId, v); onRestore(); } }, "Restore")),
    h("div", { class: "d-version-title" }, trunc(v.title, 60) || "(no title)"),
    firstLine && h("div", { class: "help" }, trunc(firstLine, 80)),
    (v.sources.length || v.origin.context || v.origin.at) && h("div", { class: "help" },
      [v.sources.length && `${v.sources.length} ${v.sources.length === 1 ? "source" : "sources"}`, v.origin.context, v.origin.at].filter(Boolean).join(" · ")));
}

/** onRestore() redraws the panel's fields after a version is brought back. */
export function historySection(itemId, onRestore) {
  const list = h("ul", { class: "d-versions" }, h("li", { class: "help" }, "Loading…"));
  const fill = async () => {
    const versions = await History.list(itemId);
    const it = Query.item(itemId);
    if (!it || !list.isConnected) return;
    const current = snapshot(it);
    list.replaceChildren(...(versions.length
      ? versions.slice().reverse().map((v) => versionRow(itemId, v, sameContent(current, v), onRestore))
      : [h("li", { class: "help" }, "No earlier versions yet. Each finished edit is kept here; edits within 5 minutes count as one.")]));
  };
  const stop = History.subscribe((id) => { if (!list.isConnected) stop(); else if (id === itemId) fill(); });
  queueMicrotask(fill);
  return h("div", { class: "group" }, h("h5", {}, "History"), list);
}
