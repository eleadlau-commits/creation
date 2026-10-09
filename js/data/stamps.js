// "Last changed" times. Rooms, items and layouts carry updatedAt, which syncing
// uses to decide which copy of a record is newest. Rather than every action
// remembering to set it, changed records are found and stamped just before saving.

const KINDS = ["rooms", "items", "layouts"];
let seen = new Map(); // "kind/key" -> the record as text, without updatedAt

const text = (rec) => { const { updatedAt, ...rest } = rec; return JSON.stringify(rest); };

/** Remember the workspace as it is now, without stamping anything (after loading). */
export function resetStamps(state) {
  seen = new Map();
  for (const kind of KINDS) for (const [key, rec] of Object.entries(state[kind] || {})) seen.set(kind + "/" + key, text(rec));
}

/** A record arrived from the account: remember it as it is, so it isn't stamped as a change here. */
export function markSeen(kind, key, rec) {
  if (rec) seen.set(kind + "/" + key, text(rec)); else seen.delete(kind + "/" + key);
}

/** Give every record that changed since last time the current time as updatedAt. */
export function stampChanges(state) {
  const t = Date.now();
  const next = new Map();
  for (const kind of KINDS) {
    for (const [key, rec] of Object.entries(state[kind] || {})) {
      const id = kind + "/" + key, now = text(rec);
      if (seen.get(id) !== now || rec.updatedAt == null) rec.updatedAt = t;
      next.set(id, now);
    }
  }
  seen = next;
}
