// Inside a room: header, the current mode (memo = full shelf; spatial = canvas + shelf),
// and the selection bar. Builds the `ctx` object that modes receive.

import { h, trunc } from "../core/dom.js";
import { Modes, modeOf, formatOf, itemSummary } from "../core/registry.js";
import { Settings } from "../settings/registry.js";
import { Data } from "../data/store.js";
import { Query, Act } from "../data/actions.js";
import { UI } from "./state.js";
import { statusEl } from "./feedback.js";
import { applyRoomTheme } from "./theme.js";
import { buildCanvas } from "./canvas.js";
import { buildShelf } from "./shelf.js";
import { editItem, activate } from "./pill.js";

/** The live context of the room on screen (rebuilt every render). */
export let currentCtx = null;

function makeContext(room, mode, layout, items) {
  const ctx = {
    room, mode, layout, items,
    pillEls: {},
    selection: UI.selection,
    item: (id) => Query.item(id),
    summary: itemSummary,
    select(sel) { UI.selection = sel; UI.render(); },
    setSelection(sel) { UI.selection = sel; },
    rerender() { UI.render(); },
    editLayout(fn, undoLabel) { Act.editLayout(room.id, mode.id, fn, undoLabel); },
    toWorld(cx, cy) {
      const r = ctx.viewport.getBoundingClientRect();
      return { x: cx - r.left - layout.pan.x, y: cy - r.top - layout.pan.y };
    },
    viewCentre() {
      const r = ctx.viewport.getBoundingClientRect();
      return { x: r.width / 2 - layout.pan.x, y: r.height / 2 - layout.pan.y - 40 };
    },
    newItemAt(pt) {
      const it = Act.addItem(room.id, { content: "New item" }, { mode: mode.id, x: Math.round(pt.x - 40), y: Math.round(pt.y - 16) });
      UI.selection = { kind: "item", id: it.id };
      UI.after(() => { const el = currentCtx?.pillEls[it.id]; if (el) editItem(el, Query.item(it.id)); });
      UI.render();
    },
  };
  currentCtx = ctx;
  return ctx;
}

function header(room, mode) {
  const nameInput = h("input", { class: "room-name-input", id: "room-name", value: room.name, "aria-label": "Room name",
    onchange: (e) => { const v = e.target.value.trim(); if (v) Act.updateRoom(room.id, { name: v }); else e.target.value = room.name; },
    onkeydown: (e) => { if (e.key === "Enter") e.target.blur(); } });

  const toggle = h("label", { class: "switch" + (room.modeSwitching ? " on" : ""), title: "Linked modes share items but keep their own structure" },
    h("input", { type: "checkbox", id: "mode-switch", checked: room.modeSwitching,
      onchange: (e) => Act.updateRoom(room.id, { modeSwitching: e.target.checked, mode: e.target.checked ? room.mode : "memo" }) }),
    h("span", { class: "track" }), "Mode switching");

  const tabs = room.modeSwitching && h("div", { class: "tabs", role: "tablist" }, Modes.list.map((m) =>
    h("button", { class: "tab" + (m.id === mode.id ? " on" : ""), role: "tab", "aria-selected": String(m.id === mode.id), title: m.blurb,
      onclick: () => { UI.selection = null; Act.updateRoom(room.id, { mode: m.id }); } }, m.label)));

  const parent = Query.room(room.parentId);
  const up = () => (parent ? UI.go("room", parent.id) : UI.go("rooms"));
  const inner = Query.items(room.id).filter((i) => i.format === "room").length;
  const where = parent ? `“${parent.name}”` : "the rooms screen";
  const question = inner
    ? `Delete this room and its items? The ${inner === 1 ? "room" : inner + " rooms"} inside move${inner === 1 ? "s" : ""} to ${where}.`
    : "Delete this room and everything in it?";
  const confirm = h("span", { class: "confirm", hidden: true }, question,
    h("button", { class: "btn danger", onclick: () => { up(); Act.deleteRoom(room.id); } }, "Delete"),
    h("button", { class: "btn ghost", onclick: () => { confirm.hidden = true; del.hidden = false; } }, "Cancel"));
  const del = h("button", { class: "btn ghost danger", onclick: () => { confirm.hidden = false; del.hidden = true; } }, "Delete room");

  const crumbs = h("nav", { class: "crumbs", "aria-label": "Where you are" },
    h("button", { class: "crumb", onclick: () => UI.go("rooms") }, "Creation"),
    Query.path(room.id).slice(0, -1).map((r) => [h("span", { class: "sep", "aria-hidden": "true" }, "›"),
      h("button", { class: "crumb", onclick: () => UI.go("room", r.id) }, r.name)]),
    h("span", { class: "sep", "aria-hidden": "true" }, "›"));

  return h("div", { class: "bar" },
    h("button", { class: "btn ghost", id: "back", onclick: up, title: parent ? `Back to “${parent.name}”` : "Back to the rooms screen", "aria-label": "Up one level" }, "←"),
    crumbs, nameInput, h("span", { class: "spacer" }), tabs, toggle, statusEl(),
    h("button", { class: "btn", onclick: () => UI.openDrawer("room") }, "Style"),
    del, confirm);
}

function selectionBar(ctx) {
  const s = ctx.selection;
  if (!s) return null;
  const stop = (e) => e.stopPropagation();
  if (s.kind === "item") {
    const it = Query.item(s.id);
    if (!it) return null;
    const placed = ctx.mode.spatial && ctx.layout.placements[it.id];
    const toShelf = placed && h("button", { onclick: () => ctx.editLayout((l) => { delete l.placements[it.id]; }) }, "To shelf");
    const pill = () => document.querySelector(`.pill[data-id="${it.id}"]`);
    if (it.format === "room") {
      const up = Query.room(ctx.room.parentId);
      return h("div", { class: "selbar", onpointerdown: stop },
        h("span", { class: "what" }, trunc(itemSummary(it), 40)),
        h("button", { onclick: () => activate(pill(), it) }, "Open"),
        h("button", { onclick: () => { const el = pill(); if (el) editItem(el, it); } }, "Rename"),
        toShelf,
        h("button", { title: up ? `Move into “${up.name}”` : "Move to the rooms screen",
          onclick: () => { UI.selection = null; Act.moveRoomOut(it.content.roomId); } }, "Move out"),
        h("button", { onclick: () => { UI.selection = null; Act.deleteRoom(it.content.roomId); } }, "Delete"));
    }
    const flavour = h("select", { "aria-label": "Flavour", id: "flavour-select",
      onchange: (e) => Act.updateItem(it.id, { flavourId: e.target.value || null }) },
      h("option", { value: "" }, "No flavour"),
      Query.flavours().map((f) => h("option", { value: f.id, selected: f.id === it.flavourId }, f.name)));
    return h("div", { class: "selbar", onpointerdown: stop },
      h("span", { class: "what" }, trunc(itemSummary(it), 40)),
      flavour,
      formatOf(it).editable && h("button", { onclick: () => { const el = pill(); if (el) editItem(el, it); } }, "Edit"),
      toShelf,
      h("button", { onclick: () => { UI.selection = null; Act.deleteItem(it.id); } }, "Delete everywhere"));
  }
  return h("div", { class: "selbar", onpointerdown: stop },
    h("span", { class: "what" }, s.kind === "edge" ? "Link selected" : "Field selected"),
    h("button", { onclick: () => { ctx.mode.deleteSelection?.(ctx); UI.selection = null; } }, "Delete"));
}

export function buildRoomView(room) {
  const mode = room.modeSwitching ? modeOf(room.mode) : modeOf("memo");
  const items = Query.items(room.id);
  const layout = Query.layout(room.id, mode.id);
  const ctx = makeContext(room, mode, layout, items);

  const body = h("div", { class: "roombody" });
  if (mode.spatial) body.append(buildCanvas(ctx), buildShelf(ctx, items.filter((i) => !layout.placements[i.id]), { full: false }));
  else body.append(buildShelf(ctx, items, { full: true }));
  const sel = selectionBar(ctx);
  if (sel) body.append(sel);

  const view = h("div", { class: "screen roomview" }, header(room, mode), body);
  applyRoomTheme(view, Settings.forRoom(Data.state, room));
  return view;
}

/** Keyboard: Delete removes the selection, Escape clears it. */
export function roomKeydown(e) {
  const ctx = currentCtx;
  if (UI.screen !== "room" || !ctx || !UI.selection) return;
  if (e.key === "Escape") { ctx.select(null); return; }
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    if (UI.selection.kind === "item") { const id = UI.selection.id; UI.selection = null; Act.deleteItem(id); }
    else { ctx.mode.deleteSelection?.(ctx); UI.selection = null; }
  }
}
