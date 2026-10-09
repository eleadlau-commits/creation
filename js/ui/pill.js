// The pill: how every item is drawn, in the shelf and on canvases.
// Its look comes from item settings (global -> flavour); its content from the item's format.

import { h, hashSeed, placeCaretEnd, isTyping } from "../core/dom.js";
import { formatOf, applyMotion } from "../core/registry.js";
import { Settings } from "../settings/registry.js";
import { Data } from "../data/store.js";
import { Act } from "../data/actions.js";
import { UI } from "./state.js";

/** opts: { selected, onSelect, onDragStart(e, el, item) } */
export function pillEl(item, { selected, onSelect, onDragStart }) {
  const v = Settings.forItem(Data.state, item);
  const fmt = formatOf(item);
  const el = h("div", {
    class: "pill" + (selected ? " sel" : "") + (fmt.id === "image" ? " image" : "") + (v.tint != null ? " tinted" : ""),
    "data-id": item.id,
    "data-outline": v.itemOutline,
    tabindex: "0",
    style: {
      "--pr": v.itemRoundness >= 100 ? "999px" : (2 + v.itemRoundness * 0.3).toFixed(1) + "px",
      ...(v.tint != null ? { "--th": v.tint } : {}),
    },
  },
  v.mark ? h("span", { class: "mark", text: v.mark }) : null,
  fmt.render(item));
  applyMotion(el, v.itemMotion, v.itemMotionStrength, hashSeed(item.id));

  el.addEventListener("pointerdown", (e) => onDragStart(e, el, item));
  el.addEventListener("dblclick", (e) => { e.stopPropagation(); editItem(el, item); });
  el.addEventListener("keydown", (e) => {
    if (isTyping()) return;
    if (e.key === "Enter") { e.preventDefault(); if (selected) editItem(el, item); else onSelect(); }
  });
  return el;
}

/** Edit an item's text in place. Enter saves, Escape cancels. */
export function editItem(el, item) {
  if (!formatOf(item).editable) return;
  const t = el.querySelector(".t");
  if (!t) return;
  UI.editingItem = item.id;
  el.classList.add("editing");
  el.style.animation = "none";
  t.contentEditable = "true";
  t.focus();
  placeCaretEnd(t);
  const finish = (save) => {
    t.onblur = null;
    t.contentEditable = "false";
    UI.editingItem = null;
    const value = t.textContent.trim();
    if (save && value && value !== item.content) Act.updateItem(item.id, { content: value });
    else UI.render();
  };
  t.onkeydown = (ev) => {
    ev.stopPropagation();
    if (ev.key === "Enter") { ev.preventDefault(); finish(true); }
    if (ev.key === "Escape") finish(false);
  };
  t.onblur = () => finish(true);
}
