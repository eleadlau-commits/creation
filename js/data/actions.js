// Reading (Query) and changing (Act) the workspace.
// UI code calls these instead of touching Data.state directly.

import { Data } from "./store.js";
import { uid, byDate, trunc } from "../core/dom.js";
import { modeOf, itemSummary } from "../core/registry.js";

const ROOM_HUES = [205, 152, 36, 328, 262, 96, 12, 182];

export const Query = {
  rooms: () => Object.values(Data.state.rooms).sort(byDate),
  room: (id) => Data.state.rooms[id],
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

export const Act = {
  /* ----- rooms ----- */
  addRoom(props = {}) {
    const room = {
      id: uid("room"), name: "Untitled room", x: 0, y: 0, w: 220, h: 170,
      hue: ROOM_HUES[Object.keys(Data.state.rooms).length % ROOM_HUES.length],
      typeId: null, settings: {}, modeSwitching: false, mode: "memo", createdAt: Date.now(), ...props,
    };
    Data.commit((s) => { s.rooms[room.id] = room; s.sample = false; });
    return room;
  },
  updateRoom(id, patch) {
    Data.commit((s) => Object.assign(s.rooms[id], patch));
  },
  deleteRoom(id) {
    const name = Query.room(id)?.name;
    Data.commit((s) => {
      delete s.rooms[id];
      for (const it of Object.values(s.items)) if (it.roomId === id) delete s.items[it.id];
      for (const k of Object.keys(s.layouts)) if (k.startsWith(id + ":")) delete s.layouts[k];
    }, `Deleted room “${name}”`);
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
