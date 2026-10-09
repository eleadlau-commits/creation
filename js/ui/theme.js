// Turns resolved settings into CSS variables on an element.
// The whole app reads colours from CSS variables (css/theme.css), so setting
// them on <html> restyles everything, and setting them on a room view restyles
// only that room.

import { luminance } from "../core/dom.js";
import { Palettes } from "../core/registry.js";

const VARS = ["--ground", "--surface", "--ink", "--ink-2", "--line", "--dot", "--accent", "--accent-ink", "--accent-soft", "--danger",
  "--room-s", "--room-l", "--room-stroke-l", "--pill-l", "--pill-line-l", "--field-a", "--grid-img", "--grid-size"];

function clear(el) {
  for (const v of VARS) el.style.removeProperty(v);
  el.style.removeProperty("color-scheme");
}
function setAll(el, tokens) {
  for (const [k, v] of Object.entries(tokens)) el.style.setProperty(k, v);
}

/** A custom background colour; text and neutral colours follow so it stays readable. */
function applyGround(el, hex) {
  const isLight = luminance(hex) > 0.28;
  const ink = isLight ? "#1b2130" : "#e8ebf0";
  setAll(el, {
    "--ground": hex,
    "--surface": `color-mix(in srgb, ${hex} ${isLight ? 45 : 82}%, ${isLight ? "#ffffff" : "#ffffff"})`,
    "--ink": ink,
    "--ink-2": isLight ? "#566072" : "#a3abb8",
    "--line": `color-mix(in srgb, ${hex} 82%, ${ink})`,
    "--dot": `color-mix(in srgb, ${hex} 76%, ${ink})`,
    "--room-l": isLight ? "86%" : "27%",
    "--room-stroke-l": isLight ? "60%" : "44%",
    "--pill-l": isLight ? "93%" : "23%",
    "--pill-line-l": isLight ? "70%" : "42%",
  });
  el.style.colorScheme = isLight ? "light" : "dark";
}

function applyAccent(el, hex) {
  const isLight = luminance(hex) > 0.4;
  setAll(el, {
    "--accent": hex,
    "--accent-ink": isLight ? "#10151f" : "#ffffff",
    "--accent-soft": `color-mix(in srgb, ${hex} 22%, var(--surface))`,
  });
}

const GRIDS = {
  dots: ["radial-gradient(circle, var(--dot) 1px, transparent 1.4px)", "22px 22px"],
  lines: ["linear-gradient(var(--dot) 1px, transparent 1px), linear-gradient(90deg, var(--dot) 1px, transparent 1px)", "28px 28px"],
  none: ["none", "auto"],
};
function applyGrid(el, kind) {
  const [img, size] = GRIDS[kind] || GRIDS.dots;
  el.style.setProperty("--grid-img", img);
  el.style.setProperty("--grid-size", size);
}

/** App-wide look, applied to <html>. values = Settings.forApp(state). */
export function applyAppTheme(values) {
  const el = document.documentElement;
  clear(el);
  const palette = Palettes.get(values.palette);
  if (palette?.tokens) { setAll(el, palette.tokens); el.style.colorScheme = palette.scheme; }
  if (values.background) applyGround(el, values.background);
  if (values.accent) applyAccent(el, values.accent);
  applyGrid(el, values.grid);
}

/** One room's interior look, applied to its room view. values = Settings.forRoom(state, room). */
export function applyRoomTheme(el, values) {
  clear(el);
  if (values.interior) applyGround(el, values.interior);
  applyGrid(el, values.interiorGrid);
}
