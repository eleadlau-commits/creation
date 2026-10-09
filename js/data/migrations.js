// The shape of saved data, and how older saved data is upgraded.
//
// RULE: whenever the data shape changes, bump CURRENT and add a step that
// turns version N into N+1. Never edit an old step. This keeps every saved
// workspace and every backup file loadable forever.
//
// State (version 3):
// {
//   version: 3,
//   settings:  { app: {}, room: {}, item: {} },      global setting values
//   roomTypes: { id: { id, name, settings, createdAt } },
//   flavours:  { id: { id, name, settings, createdAt } },
//   rooms:     { id: { id, name, x, y, w, h, hue, typeId, settings, modeSwitching, mode, parentId, createdAt } },
//              parentId: the room it sits inside, or null at the top level (x, y, w, h are
//              its place on the rooms screen, kept while nested). Mirrors the room-item below.
//   items:     { id: { id, roomId, format, flavourId, content, createdAt } },
//              roomId: the room the item is in. A room inside a room is an item with
//              format "room" and content { roomId } (see data/nesting.js).
//   layouts:   { "roomId:modeId": { placements: { itemId: {x, y} }, pan: {x, y}, ...mode data } },
//   roomsPan:  { x, y },
//   sample:    boolean
// }

import { defaultRoomTypes, defaultFlavours } from "./presets.js";
import { checkNesting } from "./nesting.js";

export const CURRENT = 3;

const steps = {
  // 1 -> 2: the "Idea Rooms" draft. Items had `type`, now `format`; settings, room types and flavours added.
  1(s) {
    for (const it of Object.values(s.items || {})) {
      it.format = it.type || "text";
      delete it.type;
      it.flavourId = null;
    }
    for (const r of Object.values(s.rooms || {})) {
      r.typeId = null;
      r.settings = {};
    }
    s.settings = { app: {}, room: {}, item: {} };
    s.roomTypes = Object.fromEntries(defaultRoomTypes().map((t) => [t.id, t]));
    s.flavours = Object.fromEntries(defaultFlavours().map((f) => [f.id, f]));
    return s;
  },
  // 2 -> 3: rooms can sit inside rooms. Every existing room is at the top level.
  2(s) {
    for (const r of Object.values(s.rooms || {})) r.parentId = null;
    return s;
  },
};

export function emptyState() {
  return normalise({
    version: CURRENT,
    roomTypes: Object.fromEntries(defaultRoomTypes().map((t) => [t.id, t])),
    flavours: Object.fromEntries(defaultFlavours().map((f) => [f.id, f])),
  });
}

/** Upgrade any saved state to the current shape. Returns null for unusable input. */
export function migrate(raw) {
  if (!raw || typeof raw !== "object" || typeof raw.rooms !== "object") return null;
  let s = JSON.parse(JSON.stringify(raw));
  let v = s.version || 1;
  if (v > CURRENT) throw new Error("This data comes from a newer version of Creation.");
  while (v < CURRENT) {
    s = steps[v](s);
    v += 1;
    s.version = v;
  }
  return normalise(s);
}

/** Fill in anything missing so the rest of the app can rely on the shape. */
function normalise(s) {
  s.version = CURRENT;
  s.settings = { app: {}, room: {}, item: {}, ...(s.settings || {}) };
  s.roomTypes = s.roomTypes || {};
  s.flavours = s.flavours || {};
  s.rooms = s.rooms || {};
  s.items = s.items || {};
  s.layouts = s.layouts || {};
  s.roomsPan = s.roomsPan || { x: 40, y: 40 };
  s.sample = !!s.sample;
  for (const r of Object.values(s.rooms)) { r.settings = r.settings || {}; r.typeId = r.typeId ?? null; }
  for (const it of Object.values(s.items)) { it.format = it.format || "text"; it.flavourId = it.flavourId ?? null; }
  checkNesting(s);
  return s;
}
