// Every user-adjustable setting, declared once.
// To add a setting: add one Settings.define({...}) here, then read it where it
// takes effect (usually ui/theme.js, ui/rooms-screen.js or ui/pill.js).
// The Settings panel picks it up automatically.

import { Settings } from "./registry.js";
import { Motions, Palettes } from "../core/registry.js";

const motionOptions = () => Motions.list.map((m) => [m.id, m.label]);
const patternOptions = [["dots", "Dots"], ["lines", "Grid lines"], ["none", "Plain"]];

/* ---------- whole app (global only) ---------- */
Settings.define({ key: "palette", target: "app", group: "Colour", label: "Palette", type: "select", default: "auto",
  options: () => Palettes.list.map((p) => [p.id, p.label]) });
Settings.define({ key: "background", target: "app", group: "Colour", label: "Background", type: "color", default: null,
  help: "Overrides the palette's background. Text colour adjusts to stay readable." });
Settings.define({ key: "accent", target: "app", group: "Colour", label: "Accent", type: "color", default: null });
Settings.define({ key: "grid", target: "app", group: "Surface", label: "Ground pattern", type: "select", default: "dots", options: patternOptions });

/* ---------- rooms (global -> room type -> room) ---------- */
Settings.define({ key: "hue", target: "room", group: "Colour", label: "Room colour", type: "hue", default: null,
  help: "Unset: every room keeps its own colour." });
Settings.define({ key: "interior", target: "room", group: "Colour", label: "Inside background", type: "color", default: null });
Settings.define({ key: "interiorGrid", target: "room", group: "Colour", label: "Inside pattern", type: "select", default: "dots", options: patternOptions });
Settings.define({ key: "roundness", target: "room", group: "Shape", label: "Roundness", type: "range", min: 0, max: 100, step: 1, default: 84,
  help: "0 is a sharp rectangle, 100 is as round as the shape allows." });
Settings.define({ key: "outline", target: "room", group: "Outline", label: "Outline", type: "select", default: "solid",
  options: [["none", "None"], ["solid", "Solid"], ["dashed", "Dashed"], ["dotted", "Dotted"]] });
Settings.define({ key: "outlineWidth", target: "room", group: "Outline", label: "Outline width", type: "range", min: 0.5, max: 5, step: 0.1, default: 1.2 });
Settings.define({ key: "motion", target: "room", group: "Motion", label: "Motion", type: "select", default: "none", options: motionOptions });
Settings.define({ key: "motionStrength", target: "room", group: "Motion", label: "Motion strength", type: "range", min: 0, max: 100, step: 1, default: 40 });

/* ---------- items (global -> flavour) ---------- */
Settings.define({ key: "tint", target: "item", group: "Colour", label: "Tint", type: "hue", default: null, help: "Unset: plain." });
Settings.define({ key: "mark", target: "item", group: "Mark", label: "Mark", type: "text", maxLength: 2, default: "",
  help: "One or two characters shown before the text, like ? or ~." });
Settings.define({ key: "itemRoundness", target: "item", group: "Shape", label: "Roundness", type: "range", min: 0, max: 100, step: 1, default: 100 });
Settings.define({ key: "itemOutline", target: "item", group: "Outline", label: "Outline", type: "select", default: "solid",
  options: [["none", "None"], ["solid", "Solid"], ["dashed", "Dashed"]] });
Settings.define({ key: "itemMotion", target: "item", group: "Motion", label: "Motion", type: "select", default: "none", options: motionOptions });
Settings.define({ key: "itemMotionStrength", target: "item", group: "Motion", label: "Motion strength", type: "range", min: 0, max: 100, step: 1, default: 30 });
