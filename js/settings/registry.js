// The settings engine. Settings are declared in settings/definitions.js;
// the Settings panel builds its controls from those declarations.
//
// Each setting has a target, which decides where it can be set:
//   app  -> global only                      (palette, background, ...)
//   room -> global -> room type -> one room  (roundness, outline, motion, ...)
//   item -> global -> flavour                (tint, mark, ...)
//
// Resolution: the most specific value that is set wins, otherwise the default.

const defs = [];

const isSet = (v) => v !== undefined && v !== null && v !== "";

export const Settings = {
  /**
   * Declare a setting.
   * { key, target: "app"|"room"|"item", group, label, type: "select"|"range"|"hue"|"color"|"text",
   *   default, options (array of [value, label] or a function returning one), min, max, step, maxLength, help }
   */
  define(def) {
    if (defs.some((d) => d.key === def.key)) throw new Error(`Duplicate setting "${def.key}"`);
    defs.push(def);
  },
  defs(target) {
    return defs.filter((d) => d.target === target);
  },
  groups(target) {
    return [...new Set(this.defs(target).map((d) => d.group))];
  },
  options(def) {
    return typeof def.options === "function" ? def.options() : def.options || [];
  },
  /** First set value among layers (most specific first), else the default. */
  resolve(def, layers) {
    for (const layer of layers) if (layer && isSet(layer[def.key])) return layer[def.key];
    return def.default;
  },
  isSet,

  /** Layers for each place a setting can be written. Most specific first. */
  layers: {
    app: (s) => [s.settings.app],
    room: (s, room) => [room?.settings, s.roomTypes[room?.typeId]?.settings, s.settings.room],
    item: (s, item) => [s.flavours[item?.flavourId]?.settings, s.settings.item],
  },

  forApp(s) {
    return this.resolveAll("app", this.layers.app(s));
  },
  forRoom(s, room) {
    return this.resolveAll("room", this.layers.room(s, room));
  },
  forItem(s, item) {
    return this.resolveAll("item", this.layers.item(s, item));
  },
  resolveAll(target, layers) {
    return Object.fromEntries(this.defs(target).map((d) => [d.key, this.resolve(d, layers)]));
  },
};
