// Rooms inside rooms. A room that lives inside another room is an item there
// with format "room" and content { roomId }. That room-item is the source of
// truth; room.parentId mirrors it for fast lookup.
//
// checkNesting() repairs saved data so the two always agree: one place per
// room, no room-items for missing rooms, and no room inside itself.

import { modeOf } from "../core/registry.js";

export const isRoomItem = (it) => it?.format === "room";
export const roomIdOf = (it) => (isRoomItem(it) ? it.content?.roomId : null);

/** Remove an item from every layout of its room (placements, links, fields). */
export function removeFromLayouts(s, item) {
  for (const [key, layout] of Object.entries(s.layouts)) {
    if (!key.startsWith(item.roomId + ":")) continue;
    delete layout.placements?.[item.id];
    modeOf(key.split(":")[1]).onItemDeleted?.(layout, item.id);
  }
}

/** Free spot on the rooms screen for a room arriving at the top level. */
export function freeSpot(s, room) {
  const others = Object.values(s.rooms).filter((r) => r.id !== room.id && !r.parentId);
  const hits = (x, y) => others.some((o) => x < o.x + o.w + 20 && x + room.w + 20 > o.x && y < o.y + o.h + 20 && y + room.h + 20 > o.y);
  if (!hits(room.x, room.y)) return { x: room.x, y: room.y };
  const right = Math.max(...others.map((o) => o.x + o.w));
  const top = Math.min(...others.map((o) => o.y));
  return { x: right + 40, y: top };
}

/** Make data consistent. Returns the number of repairs (0 for healthy data). */
export function checkNesting(s) {
  let repairs = 0;
  const drop = (it) => { removeFromLayouts(s, it); delete s.items[it.id]; repairs += 1; };
  const placeOf = {};
  const roomItems = Object.values(s.items).filter(isRoomItem).sort((a, b) => a.createdAt - b.createdAt);
  for (const it of roomItems) {
    const id = roomIdOf(it);
    if (!s.rooms[id] || !s.rooms[it.roomId] || id === it.roomId || placeOf[id]) drop(it);
    else placeOf[id] = it;
  }
  // A chain of parents that comes back to itself: lift the room out of the loop.
  for (const room of Object.values(s.rooms)) {
    const seen = new Set([room.id]);
    for (let p = placeOf[room.id]?.roomId; p; p = placeOf[p]?.roomId) {
      if (seen.has(p)) { drop(placeOf[room.id]); delete placeOf[room.id]; break; }
      seen.add(p);
    }
  }
  for (const room of Object.values(s.rooms)) {
    const parentId = placeOf[room.id]?.roomId ?? null;
    if ((room.parentId ?? null) === parentId) { room.parentId = parentId; continue; }
    const wasNested = !!room.parentId;
    room.parentId = parentId;
    if (wasNested && !parentId) Object.assign(room, freeSpot(s, room));
    repairs += 1;
  }
  if (repairs) console.warn(`Creation repaired ${repairs} problem(s) with rooms inside rooms.`);
  return repairs;
}
