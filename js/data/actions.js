// Reading (Query) and changing (Act) the workspace.
// UI code calls these instead of touching Data.state directly.

import { Data } from "./store.js";
import { uid, byDate, trunc } from "../core/dom.js";
import { modeOf, itemSummary } from "../core/registry.js";
import { isRoomItem, roomIdOf, removeFromLayouts, freeSpot } from "./nesting.js";

const ROOM_HUES = [205, 152, 36, 328, 262, 96, 12, 182];

export const Query = {
  rooms: () => Object.values(Data.state.rooms).sort(byDate),
  /** Rooms on the rooms screen (not inside another room). */
  topRooms: () => Query.rooms().filter((r) => !r.parentId),
  room: (id) => Data.state.rooms[id],
  /** The item that stands for a room inside its parent, if it has one. */
  roomItemOf: (roomId) => Object.values(Data.state.items).find((i) => roomIdOf(i) === roomId),
  /** The rooms from the top level down to this one. */
  path(roomId) {
    const list = [];
    for (let r = Query.room(roomId); r && list.length < 100; r = Query.room(r.parentId)) list.unshift(r);
    return list;
  },
  items: (roomId) => Object.values(Data.state.items).filter((i) => i.roomId === roomId).sort(byDate),
  item: (id) => Data.state.items[id],
  roomTypes: () => Object.values(Data.state.roomTypes).sort(byDate),
  roomType: (id) => Data.state.roomTypes[id],
  flavours: () => Object.values(Data.state.flavours).sort(byDate),
  flavour: (id) => Data.state.flavours[id],
  /** The layout of a room in a mode; created on first use. */
  layout(roomId, modeId) {
    const key = roomId + ":" + modeId;
    if (!Data.state.layouts[key]) Data.state.layouts[key] = modeOf(modeId).emptyLayout();
    return Data.state.layouts[key];
  },
  layoutsOf: (roomId) => Object.entries(Data.state.layouts).filter(([k]) => k.startsWith(roomId + ":")),
};

function newRoom(props) {
  return {
    id: uid("room"), name: "Untitled room", x: 0, y: 0, w: 220, h: 170,
    hue: ROOM_HUES[Object.keys(Data.state.rooms).length % ROOM_HUES.length],
    typeId: null, settings: {}, modeSwitching: false, mode: "memo", parentId: null, createdAt: Date.now(), ...props,
  };
}
/* The helpers below run inside a commit and keep room-items and parentId in step. */
function takeOut(s, roomId) {
  for (const it of Object.values(s.items)) {
    if (roomIdOf(it) !== roomId) continue;
    removeFromLayouts(s, it);
    delete s.items[it.id];
  }
}
function putInside(s, room, parentId) {
  const item = { id: uid("item"), roomId: parentId, format: "room", flavourId: null, content: { roomId: room.id }, createdAt: Date.now() };
  s.items[item.id] = item;
  room.parentId = parentId;
}
function moveTo(s, room, parentId) {
  takeOut(s, room.id);
  if (parentId) putInside(s, room, parentId);
  else { room.parentId = null; Object.assign(room, freeSpot(s, room)); }
}

export const Act = {
  /* ----- rooms ----- */
  addRoom(props = {}) {
    const room = newRoom(props);
    Data.commit((s) => { s.rooms[room.id] = room; s.sample = false; });
    return room;
  },
  updateRoom(id, patch) {
    Data.commit((s) => Object.assign(s.rooms[id], patch));
  },
  /** A new room directly inside parentId; it arrives on the parent's shelf. */
  addChildRoom(parentId) {
    const room = newRoom({ parentId });
    Data.commit((s) => { s.rooms[room.id] = room; s.sample = false; putInside(s, room, parentId); });
    return room;
  },
  /** Move top-level rooms into a new top-level room placed where they were. */
  groupRooms(ids) {
    const picked = ids.map(Query.room).filter((r) => r && !r.parentId);
    if (!picked.length) return null;
    const group = newRoom({ x: Math.min(...picked.map((r) => r.x)), y: Math.min(...picked.map((r) => r.y)) });
    Data.commit((s) => {
      s.rooms[group.id] = group;
      for (const r of picked) putInside(s, s.rooms[r.id], group.id);
    }, `Grouped ${picked.length} ${picked.length === 1 ? "room" : "rooms"} into a new room`);
    return group;
  },
  /** Move a room up one level: into its parent's parent, or to the top level. */
  moveRoomOut(id) {
    const room = Query.room(id);
    if (!room?.parentId) return;
    const up = Query.room(room.parentId)?.parentId ?? null;
    Data.commit((s) => moveTo(s, s.rooms[id], up),
      `Moved “${trunc(room.name, 28)}” ${up ? "into “" + trunc(Query.room(up).name, 28) + "”" : "to the rooms screen"}`);
  },
  /** Delete a room and its items. Rooms inside it move up to where it was. */
  deleteRoom(id) {
    const room = Query.room(id);
    if (!room) return;
    Data.commit((s) => {
      for (const it of Object.values(s.items)) {
        if (it.roomId !== id) continue;
        if (isRoomItem(it) && s.rooms[roomIdOf(it)]) moveTo(s, s.rooms[roomIdOf(it)], room.parentId ?? null);
        else delete s.items[it.id];
      }
      takeOut(s, id);
      delete s.rooms[id];
      for (const k of Object.keys(s.layouts)) if (k.startsWith(id + ":")) delete s.layouts[k];
    }, `Deleted room “${trunc(room.name, 28)}”`);
  },

  /* ----- items ----- */
  /** placeIn = { mode, x, y } to place the new item straight onto a canvas. */
  addItem(roomId, { format = "text", content = "", flavourId = null } = {}, placeIn) {
    const item = { id: uid("item"), roomId, format, flavourId, content, createdAt: Date.now() };
    Data.commit((s) => {
      s.items[item.id] = item;
      if (placeIn) Query.layout(roomId, placeIn.mode).placements[item.id] = { x: placeIn.x, y: placeIn.y };
    });
    return item;
  },
  updateItem(id, patch) {
    Data.commit((s) => Object.assign(s.items[id], patch));
  },
  /** Deleting an item removes it from every mode of its room. */
  deleteItem(id) {
    const it = Query.item(id);
    if (!it) return;
    if (isRoomItem(it)) { Act.deleteRoom(roomIdOf(it)); return; }
    Data.commit((s) => {
      delete s.items[id];
      for (const [key, layout] of Query.layoutsOf(it.roomId)) {
        delete layout.placements[id];
        modeOf(key.split(":")[1]).onItemDeleted?.(layout, id);
      }
    }, `Deleted “${trunc(itemSummary(it), 28)}” from every mode`);
  },

  /* ----- layouts ----- */
  editLayout(roomId, modeId, fn, undoLabel) {
    Data.commit(() => fn(Query.layout(roomId, modeId)), undoLabel);
  },

  /* ----- settings ----- */
  /** locate(state) returns the settings object to write into. null removes the value (inherit). */
  setSetting(locate, key, value) {
    Data.commit((s) => {
      const target = locate(s);
      if (!target) return;
      if (value === null || value === undefined || value === "") delete target[key];
      else target[key] = value;
    });
  },

  /* ----- room types and flavours (presets of settings) ----- */
  addRoomType(name = "New room type") {
    const t = { id: uid("rtype"), name, settings: {}, createdAt: Date.now() };
    Data.commit((s) => { s.roomTypes[t.id] = t; });
    return t;
  },
  updateRoomType(id, patch) {
    Data.commit((s) => Object.assign(s.roomTypes[id], patch));
  },
  deleteRoomType(id) {
    const name = Query.roomType(id)?.name;
    Data.commit((s) => {
      delete s.roomTypes[id];
      for (const r of Object.values(s.rooms)) if (r.typeId === id) r.typeId = null;
    }, `Deleted room type “${name}”`);
  },
  addFlavour(name = "New flavour") {
    const f = { id: uid("flav"), name, settings: {}, createdAt: Date.now() };
    Data.commit((s) => { s.flavours[f.id] = f; });
    return f;
  },
  updateFlavour(id, patch) {
    Data.commit((s) => Object.assign(s.flavours[id], patch));
  },
  deleteFlavour(id) {
    const name = Query.flavour(id)?.name;
    Data.commit((s) => {
      delete s.flavours[id];
      for (const it of Object.values(s.items)) if (it.flavourId === id) it.flavourId = null;
    }, `Deleted flavour “${name}”`);
  },
};
