// Deciding, record by record, which copy wins: this browser's or the account's.
// Pure functions (no saving, no network), used by data/sync.js.
//
// The "shadow" is what this browser last agreed with the account:
//   { "rooms/<id>": { at, del }, ..., meta: { text, at } }
// It tells a record deleted here apart from one that is simply new over there.

export const KINDS = ["rooms", "items", "layouts"];

/** The workspace-wide part that syncs as one record. */
export const metaOf = (s) => ({ version: s.version, settings: s.settings, roomTypes: s.roomTypes, flavours: s.flavours, roomsPan: s.roomsPan });
export const metaText = (m) => JSON.stringify({ settings: m?.settings, roomTypes: m?.roomTypes, flavours: m?.flavours, roomsPan: m?.roomsPan });
const bare = (rec) => { const { updatedAt, ...rest } = rec || {}; return JSON.stringify(rest); };

/**
 * One record. L: this browser's (or undefined), R: the account's (maybe a deletion marker),
 * S: the shadow entry. Returns "push" (send ours), "apply" (take theirs), "tomb" (tell the
 * account we deleted it), "drop" (delete ours), or null (nothing to do).
 */
export function decide(L, R, S) {
  const Lt = L?.updatedAt ?? 0, Rt = R?.updatedAt ?? 0;
  if (L && R) {
    if (Lt > Rt) return "push";
    if (Rt > Lt) return R.deleted ? "drop" : "apply";
    return null;
  }
  if (L) return "push";
  if (R && !R.deleted) return S && !S.del && Rt <= S.at ? "tomb" : "apply";
  return null;
}

/** Records with live content from an account read: { kind: { key: rec } } without markers. */
export function liveOf(remote) {
  const out = {};
  for (const kind of KINDS) out[kind] = Object.fromEntries(Object.entries(remote[kind] || {}).filter(([, r]) => !r.deleted));
  return out;
}

/** Does the account hold anything at all? */
export const hasContent = (remote) => !!remote.meta || KINDS.some((k) => Object.values(remote[k] || {}).some((r) => !r.deleted));

/** Same ideas in both, ignoring when things were changed? */
export function sameContent(state, remote) {
  if (metaText(metaOf(state)) !== metaText(remote.meta)) return false;
  const live = liveOf(remote);
  return KINDS.every((kind) => {
    const a = state[kind] || {}, b = live[kind];
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((k) => a[k] && b[k] && bare(a[k]) === bare(b[k]));
  });
}

/** A shadow that says: this browser and the account agree on exactly what the account holds. */
export function shadowOf(remote) {
  const sh = {};
  for (const kind of KINDS) for (const [key, r] of Object.entries(remote[kind] || {})) sh[kind + "/" + key] = { at: r.updatedAt ?? 0, del: !!r.deleted };
  sh.meta = { text: metaText(remote.meta), at: remote.meta?.updatedAt ?? 0 };
  return sh;
}
