// The first screen: squircle rooms on an open ground.
// Rooms can be moved, resized and renamed; their look comes from room settings.

import { h, svg, drag, clamp, hashSeed, placeCaretEnd } from "../core/dom.js";
import { applyMotion } from "../core/registry.js";
import { squirclePath } from "../core/squircle.js";
import { Settings } from "../settings/registry.js";
import { Data } from "../data/store.js";
import { Query, Act } from "../data/actions.js";
import { emptyState } from "../data/migrations.js";
import { UI } from "./state.js";
import { statusEl } from "./feedback.js";

/** The room name scales with its squircle, but never breaks inside a word. */
function nameSize(name, w, hgt) {
  const len = Math.max(5, name.length);
  const longest = Math.max(4, ...name.split(/\s+/).map((x) => x.length));
  const byArea = Math.sqrt((w * 0.78 * hgt * 0.5) / (len * 0.55));
  const byWord = (w * 0.8) / (longest * 0.58);
  return clamp(Math.min(hgt * 0.24, byArea, byWord, 84), 10, 84);
}

function strokeFor(path, v) {
  const w = v.outline === "none" ? 0 : Number(v.outlineWidth);
  path.setAttribute("stroke-width", w);
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-dasharray", v.outline === "dashed" ? `${w * 4} ${w * 3}` : v.outline === "dotted" ? `0 ${w * 2.6}` : "none");
}

function rename(room, nameEl) {
  nameEl.contentEditable = "true";
  nameEl.focus();
  placeCaretEnd(nameEl);
  const finish = (save) => {
    nameEl.onblur = null;
    nameEl.contentEditable = "false";
    const v = nameEl.textContent.trim();
    if (save && v && v !== room.name) Act.updateRoom(room.id, { name: v });
    else UI.render();
  };
  nameEl.onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === "Enter") { ev.preventDefault(); finish(true); } if (ev.key === "Escape") finish(false); };
  nameEl.onblur = () => finish(true);
}

function roomEl(room) {
  const v = Settings.forRoom(Data.state, room);
  const count = Query.items(room.id).length;
  const type = Query.roomType(room.typeId);
  const path = svg("path");
  strokeFor(path, v);
  const shape = svg("svg", { class: "shape" }, path);
  const name = h("div", { class: "rname", text: room.name });
  const meta = h("div", { class: "rmeta", text: [type?.name, `${count} ${count === 1 ? "item" : "items"}`].filter(Boolean).join(" · ") });
  const body = h("div", { class: "room-body" }, shape, h("div", { class: "inner" }, name, meta));
  const grip = h("div", { class: "resize", title: "Drag to resize" });
  const el = h("div", { class: "room", "data-id": room.id, tabindex: "0", "aria-label": "Open room " + room.name,
    style: { "--h": v.hue ?? room.hue } }, body, grip);
  applyMotion(body, v.motion, v.motionStrength, hashSeed(room.id));

  const size = (w, hh) => {
    Object.assign(el.style, { left: room.x + "px", top: room.y + "px", width: w + "px", height: hh + "px" });
    shape.setAttribute("width", w);
    shape.setAttribute("height", hh);
    path.setAttribute("d", squirclePath(w, hh, v.roundness));
    name.style.fontSize = nameSize(room.name, w, hh) + "px";
    meta.hidden = !(hh > 100 && w > 120);
  };
  size(room.w, room.h);

  el.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target === el) UI.go("room", room.id); });
  el.addEventListener("pointerdown", (e) => {
    if (name.isContentEditable) return;
    e.stopPropagation();
    if (e.target === grip) {
      const sw = room.w, sh = room.h;
      drag(e, { threshold: 0,
        move: (dx, dy) => { room.w = Math.round(clamp(sw + dx, 90, 1400)); room.h = Math.round(clamp(sh + dy, 70, 1000)); size(room.w, room.h); },
        end: (ev, moved) => { if (moved) { const next = { w: room.w, h: room.h }; room.w = sw; room.h = sh; Act.updateRoom(room.id, next); } } });
      return;
    }
    const sx = room.x, sy = room.y;
    el.style.zIndex = 10;
    drag(e, {
      move: (dx, dy) => { el.style.left = sx + dx + "px"; el.style.top = sy + dy + "px"; },
      end: (ev, moved) => {
        if (!moved) { UI.go("room", room.id); return; }
        Act.updateRoom(room.id, { x: Math.round(sx + ev.clientX - e.clientX), y: Math.round(sy + ev.clientY - e.clientY) });
      },
    });
  });
  if (UI.renameRoomId === room.id) { UI.renameRoomId = null; UI.after(() => rename(room, name)); }
  return el;
}

export function buildRoomsScreen() {
  const s = Data.state;
  const world = h("div", { class: "world" });
  const plane = h("div", { class: "plane" }, world);
  const setPan = () => { world.style.transform = `translate(${s.roomsPan.x}px, ${s.roomsPan.y}px)`; };
  setPan();

  const rooms = Query.rooms();
  for (const room of rooms) world.append(roomEl(room));
  if (!rooms.length) plane.append(h("div", { class: "empty-note" }, h("b", {}, "No rooms yet"), "Double-click anywhere, or use New room, to make your first one."));

  const create = (x, y) => { const room = Act.addRoom({ x: Math.round(x), y: Math.round(y) }); UI.renameRoomId = room.id; UI.render(); };
  plane.addEventListener("pointerdown", (e) => {
    if (e.target !== plane && e.target !== world) return;
    const start = { ...s.roomsPan };
    plane.classList.add("panning");
    drag(e, {
      move: (dx, dy) => { s.roomsPan = { x: start.x + dx, y: start.y + dy }; setPan(); },
      end: (ev, moved) => { plane.classList.remove("panning"); if (moved) Data.quiet(); },
    });
  });
  plane.addEventListener("wheel", (e) => { e.preventDefault(); s.roomsPan.x -= e.deltaX; s.roomsPan.y -= e.deltaY; setPan(); Data.quiet(); }, { passive: false });
  plane.addEventListener("dblclick", (e) => {
    if (e.target !== plane && e.target !== world) return;
    const r = plane.getBoundingClientRect();
    create(e.clientX - r.left - s.roomsPan.x - 110, e.clientY - r.top - s.roomsPan.y - 85);
  });

  if (s.sample) plane.append(h("div", { class: "banner" },
    h("p", {}, h("b", {}, "This is a sample workspace. "), "Open a room to try its modes, or open Settings to change how everything looks."),
    h("button", { class: "btn", onclick: () => Data.commit((st) => { st.sample = false; }) }, "Keep it"),
    h("button", { class: "btn primary", onclick: () => Data.commit((st) => Object.assign(st, emptyState()), "Cleared the sample workspace") }, "Start empty")));

  const bar = h("div", { class: "bar" },
    h("button", { class: "brand brand-link", title: "Home", onclick: () => UI.go("home") }, "Creation"),
    h("span", { class: "spacer" }),
    statusEl(),
    h("button", { class: "btn ghost", onclick: () => UI.openDrawer(UI.drawer.tab === "room" ? "everywhere" : UI.drawer.tab) }, "Settings"),
    h("button", { class: "btn primary", onclick: () => { const r = plane.getBoundingClientRect(); create(r.width / 2 - s.roomsPan.x - 110, r.height / 2 - s.roomsPan.y - 85); } }, "New room"));

  return h("div", { class: "screen" }, bar, plane);
}
