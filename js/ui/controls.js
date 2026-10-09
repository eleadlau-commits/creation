// Builds setting controls from the declarations in settings/definitions.js.
// You should rarely need to edit this file: new settings appear automatically.
// To support a new control `type`, add one function to BUILDERS.

import { h } from "../core/dom.js";
import { Settings } from "../settings/registry.js";
import { Data } from "../data/store.js";
import { Act } from "../data/actions.js";
import { UI } from "./state.js";

const fmt = (def, v) => (def.step && def.step < 1 ? Number(v).toFixed(1) : String(v));

const BUILDERS = {
  select(def, value, set) {
    return h("select", { onchange: (e) => set(e.target.value, true) },
      Settings.options(def).map(([val, label]) => h("option", { value: val, selected: String(val) === String(value) }, label)));
  },
  range(def, value, set) {
    const out = h("output", { class: "num", text: fmt(def, value) });
    const input = h("input", { type: "range", min: def.min, max: def.max, step: def.step, value,
      oninput: (e) => { out.textContent = fmt(def, e.target.value); set(Number(e.target.value), false); },
      onchange: (e) => set(Number(e.target.value), true) });
    return h("span", { class: "with-out" }, input, out);
  },
  hue(def, value, set) {
    const shown = value ?? 200;
    const swatch = h("span", { class: "swatch" + (value == null ? " auto" : ""), style: { background: `hsl(${shown} 55% 60%)` } });
    const input = h("input", { type: "range", min: 0, max: 360, step: 1, value: shown, class: "hue-range",
      oninput: (e) => { swatch.style.background = `hsl(${e.target.value} 55% 60%)`; swatch.classList.remove("auto"); set(Number(e.target.value), false); },
      onchange: (e) => set(Number(e.target.value), true) });
    return h("span", { class: "with-out" }, input, swatch);
  },
  color(def, value, set) {
    const fallback = getComputedStyle(document.documentElement).getPropertyValue(def.key === "accent" ? "--accent" : "--ground").trim();
    const safe = /^#[0-9a-f]{6}$/i.test(value || "") ? value : /^#[0-9a-f]{6}$/i.test(fallback) ? fallback : "#888888";
    return h("input", { type: "color", value: safe,
      oninput: (e) => set(e.target.value, false), onchange: (e) => set(e.target.value, true) });
  },
  text(def, value, set) {
    return h("input", { type: "text", value: value ?? "", maxLength: def.maxLength || 40, class: "short",
      oninput: (e) => set(e.target.value, false), onchange: (e) => set(e.target.value, true) });
  },
};

function describe(def, v) {
  if (v === null || v === undefined || v === "") return def.type === "hue" ? "auto" : def.type === "color" ? "palette" : "none";
  if (def.type === "select") return Settings.options(def).find(([val]) => String(val) === String(v))?.[1] ?? v;
  return fmt(def, v);
}

/**
 * Controls for one place settings can be written.
 * target: "app" | "room" | "item"
 * locate(state) -> the settings object being edited
 * parents(state) -> settings objects it inherits from, most specific first
 */
export function settingsControls(target, locate, parents) {
  const s = Data.state;
  const own = locate(s) || {};
  const inheritedLayers = parents(s);
  return Settings.groups(target).map((group) => h("div", { class: "group" },
    h("h5", {}, group),
    Settings.defs(target).filter((d) => d.group === group).map((def) => {
      const isSet = Settings.isSet(own[def.key]);
      const inherited = Settings.resolve(def, inheritedLayers);
      const value = isSet ? own[def.key] : inherited;
      const set = (v, final) => {
        Act.setSetting(locate, def.key, v);
        if (final) UI.renderDrawer();
      };
      return h("div", { class: "control" + (isSet ? " is-set" : "") },
        h("div", { class: "control-head" },
          h("label", {}, def.label),
          isSet
            ? h("button", { class: "reset", title: "Go back to the inherited value", onclick: () => set(null, true) }, "Reset")
            : h("span", { class: "inherit" }, "inherits: " + describe(def, inherited))),
        BUILDERS[def.type](def, value, set),
        def.help && h("p", { class: "help" }, def.help));
    })));
}
