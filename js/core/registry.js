// Plug-in registries. Plug-in files export a plain object; js/plugins.js registers them here.
// Nothing in this file knows about any specific mode, format, motion or palette.

function createRegistry(kind) {
  const list = [];
  const byId = {};
  return {
    list,
    byId,
    register(plugin) {
      if (!plugin || !plugin.id) throw new Error(`A ${kind} needs an id`);
      if (byId[plugin.id]) throw new Error(`Duplicate ${kind} id "${plugin.id}"`);
      list.push(plugin);
      byId[plugin.id] = plugin;
      return plugin;
    },
    get(id) { return byId[id]; },
  };
}

/** Modes: ways of arranging a room's items (memo, graph, fuzzy, ...). */
export const Modes = createRegistry("mode");
/** Formats: what an item's content physically is (text, image, ...). */
export const Formats = createRegistry("format");
/** Motions: ambient movement styles for rooms and items. */
export const Motions = createRegistry("motion");
/** Palettes: named sets of colour tokens. */
export const Palettes = createRegistry("palette");

export const modeOf = (id) => Modes.get(id) || Modes.get("memo");
export const formatOf = (item) => Formats.get(item?.format) || Formats.get("text");

/** One-line text for any item, whatever its format. */
export const itemSummary = (item) => (item ? formatOf(item).summary(item) : "");

const injected = new Set();
/** Apply a motion to an element. Keyframes are injected once per motion. */
export function applyMotion(el, motionId, strength, seed) {
  el.style.animation = "";
  el.classList.remove("motion");
  const m = Motions.get(motionId);
  if (!m || !m.apply) return;
  if (m.keyframes && !injected.has(m.id)) {
    document.head.append(Object.assign(document.createElement("style"), { textContent: m.keyframes }));
    injected.add(m.id);
  }
  el.classList.add("motion");
  m.apply(el, Number(strength) || 0, seed);
}
