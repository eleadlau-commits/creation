// The Settings drawer. Tabs:
//   This room   overrides for the open room (+ its room type)
//   Everywhere  global values for the app, all rooms and all items
//   Room types  presets of room settings
//   Flavours    presets of item settings
//   Data        backups
// It renders separately from the main view so sliders keep working while the app redraws.

import { h } from "../core/dom.js";
import { Data } from "../data/store.js";
import { Query, Act } from "../data/actions.js";
import { UI } from "./state.js";
import { settingsControls } from "./controls.js";
import { dataPanel } from "./data-panel.js";

const section = (title, ...kids) => h("section", { class: "dsec" }, h("h4", {}, title), ...kids);

function roomTab() {
  const room = Query.room(UI.roomId);
  if (!room) return h("p", { class: "help" }, "Open a room to style it on its own.");
  const typeSelect = h("select", { id: "room-type", onchange: (e) => { Act.updateRoom(room.id, { typeId: e.target.value || null }); UI.renderDrawer(); } },
    h("option", { value: "" }, "No type"),
    Query.roomTypes().map((t) => h("option", { value: t.id, selected: t.id === room.typeId }, t.name)));
  return [
    section("Room type",
      h("div", { class: "row" }, typeSelect,
        room.typeId && h("button", { class: "btn ghost", onclick: () => { UI.drawer.expanded = room.typeId; UI.openDrawer("types"); } }, "Edit type")),
      h("p", { class: "help" }, "A room takes its type's look. Anything you set below applies to this room only.")),
    section(`Only “${room.name}”`,
      settingsControls("room", (s) => s.rooms[room.id]?.settings, (s) => [s.roomTypes[s.rooms[room.id]?.typeId]?.settings, s.settings.room])),
  ];
}

function everywhereTab() {
  return [
    section("Whole app", settingsControls("app", (s) => s.settings.app, () => [])),
    section("All rooms", h("p", { class: "help" }, "Defaults for every room. Room types and single rooms can override them."),
      settingsControls("room", (s) => s.settings.room, () => [])),
    section("All items", h("p", { class: "help" }, "Defaults for every item. Flavours can override them."),
      settingsControls("item", (s) => s.settings.item, () => [])),
  ];
}

/** Shared editor for room types and flavours: both are a name plus settings overrides. */
function presetList({ list, target, add, update, remove, usage, collection, parents, intro, addLabel }) {
  return [
    h("p", { class: "help" }, intro),
    list.map((p) => {
      const open = UI.drawer.expanded === p.id;
      const confirm = h("span", { class: "confirm", hidden: true },
        usage(p.id) ? `Used by ${usage(p.id)}. Delete anyway?` : "Delete?",
        h("button", { class: "btn danger", onclick: () => { remove(p.id); UI.renderDrawer(); } }, "Delete"),
        h("button", { class: "btn ghost", onclick: () => { confirm.hidden = true; } }, "Cancel"));
      return h("div", { class: "preset" + (open ? " open" : "") },
        h("button", { class: "preset-head", "aria-expanded": String(open),
          onclick: () => { UI.drawer.expanded = open ? null : p.id; UI.renderDrawer(); } },
          h("span", {}, p.name), h("span", { class: "count" }, usage(p.id) ? String(usage(p.id)) : "")),
        open && h("div", { class: "preset-body" },
          h("label", { class: "control-head" }, "Name"),
          h("input", { type: "text", value: p.name, class: "full", onchange: (e) => { const v = e.target.value.trim(); if (v) update(p.id, { name: v }); UI.renderDrawer(); } }),
          settingsControls(target, (s) => s[collection][p.id]?.settings, parents),
          h("div", { class: "row" }, h("button", { class: "btn ghost danger", onclick: () => { confirm.hidden = false; } }, "Delete"), confirm)));
    }),
    h("button", { class: "btn", onclick: () => { const p = add(); UI.drawer.expanded = p.id; UI.renderDrawer(); } }, addLabel),
  ];
}

function typesTab() {
  return presetList({
    list: Query.roomTypes(), target: "room", collection: "roomTypes", parents: (s) => [s.settings.room],
    add: () => Act.addRoomType(), update: Act.updateRoomType, remove: Act.deleteRoomType,
    usage: (id) => { const n = Query.rooms().filter((r) => r.typeId === id).length; return n ? `${n} ${n === 1 ? "room" : "rooms"}` : 0; },
    intro: "A room type is a named look for rooms. Give a room a type in its Style panel.",
    addLabel: "+ New room type",
  });
}

function flavoursTab() {
  return presetList({
    list: Query.flavours(), target: "item", collection: "flavours", parents: (s) => [s.settings.item],
    add: () => Act.addFlavour(), update: Act.updateFlavour, remove: Act.deleteFlavour,
    usage: (id) => { const n = Object.values(Data.state.items).filter((i) => i.flavourId === id).length; return n ? `${n} ${n === 1 ? "item" : "items"}` : 0; },
    intro: "A flavour is a kind of idea, like a hunch or a question, with its own look. Select an item to give it a flavour.",
    addLabel: "+ New flavour",
  });
}

const TABS = [
  ["room", "This room", roomTab],
  ["everywhere", "Everywhere", everywhereTab],
  ["types", "Room types", typesTab],
  ["flavours", "Flavours", flavoursTab],
  ["data", "Data", dataPanel],
];

export function renderDrawer() {
  const root = document.getElementById("drawer-root");
  if (!UI.drawer.open) { root.replaceChildren(); return; }
  const tabs = TABS.filter(([id]) => id !== "room" || UI.screen === "room");
  if (!tabs.some(([id]) => id === UI.drawer.tab)) UI.drawer.tab = "everywhere";
  const scroll = root.querySelector(".drawer-body")?.scrollTop || 0;
  const [, , build] = tabs.find(([id]) => id === UI.drawer.tab);
  const body = h("div", { class: "drawer-body" }, build());
  root.replaceChildren(h("aside", { class: "drawer", "aria-label": "Settings" },
    h("div", { class: "drawer-head" },
      h("h3", {}, "Settings"),
      h("button", { class: "btn ghost", onclick: () => { UI.drawer.open = false; renderDrawer(); }, "aria-label": "Close settings" }, "Close")),
    h("div", { class: "drawer-tabs", role: "tablist" }, tabs.map(([id, label]) =>
      h("button", { class: "tab" + (id === UI.drawer.tab ? " on" : ""), role: "tab", "aria-selected": String(id === UI.drawer.tab),
        onclick: () => { UI.drawer.tab = id; renderDrawer(); } }, label))),
    body));
  body.scrollTop = scroll;
}
