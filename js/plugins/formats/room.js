// A room inside another room. content = { roomId }
// Drawn as a small squircle chip in that room's own colour, with its name and
// how many things are directly inside it. Flavours don't apply: the room keeps its own look.
import { h } from "../../core/dom.js";
import { Settings } from "../../settings/registry.js";
import { Data } from "../../data/store.js";
import { Query } from "../../data/actions.js";

const roomOf = (item) => Query.room(item.content?.roomId);

export default {
  id: "room",
  label: "Room",
  editable: false,
  /** The room's own look replaces item settings and flavours. */
  look(item) {
    const room = roomOf(item);
    return { class: "room-chip", style: room ? { "--h": Settings.forRoom(Data.state, room).hue ?? room.hue } : {} };
  },
  render(item) {
    const room = roomOf(item);
    if (!room) return h("span", { class: "t missing", text: "Missing room" });
    const n = Query.items(room.id).length;
    return [h("span", { class: "t", text: room.name }), h("span", { class: "count", text: String(n), title: `${n} ${n === 1 ? "thing" : "things"} inside` })];
  },
  summary: (item) => roomOf(item)?.name || "Missing room",
  /** Double-click or Enter: go inside. */
  open(item, go) { if (roomOf(item)) go("room", item.content.roomId); },
  /** Rename in place: the text being edited is the room's name. */
  rename: (item) => ({ value: roomOf(item)?.name ?? "", room: item.content?.roomId }),
};
