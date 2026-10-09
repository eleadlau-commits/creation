// Fuzzy mode: overlapping fields; an item belongs to each by degree (0 to 1).
// Layout data: { placements, pan, fields: [{ id, name, x, y, r, hue }] }
import { h, drag, uid, clamp, trunc, placeCaretEnd } from "../../core/dom.js";

const FIELD_HUES = [212, 150, 330, 38, 268, 8, 180];
let pendingRename = null; // field id to rename after the next render

/** Membership: 1 within a quarter of the radius, easing to 0 at the edge. */
function degree(f, p) {
  const d = Math.hypot(p.x - f.x, p.y - f.y) / f.r;
  if (d <= 0.25) return 1;
  if (d >= 1) return 0;
  return 0.5 * (1 + Math.cos(Math.PI * (d - 0.25) / 0.75));
}
const centreOf = (el) => ({ x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 });
function memberships(ctx, id) {
  const el = ctx.pillEls[id];
  if (!el) return [];
  const p = centreOf(el);
  return ctx.layout.fields.map((f) => ({ f, m: degree(f, p) })).sort((a, b) => b.m - a.m);
}
function placeField(el, f) {
  Object.assign(el.style, { left: f.x - f.r + "px", top: f.y - f.r + "px", width: 2 * f.r + "px", height: 2 * f.r + "px" });
}
function paintDots(ctx) {
  for (const [id, el] of Object.entries(ctx.pillEls)) {
    el.querySelector(".dots")?.remove();
    const ms = memberships(ctx, id).filter((x) => x.m > 0.04);
    if (!ms.length) continue;
    el.append(h("span", { class: "dots" }, ms.map((x) =>
      h("i", { style: { background: `hsl(${x.f.hue} 60% 50% / ${(0.25 + 0.75 * x.m).toFixed(2)})` } }))));
  }
}
function addField(ctx, pt) {
  const f = { id: uid("field"), name: "Field " + (ctx.layout.fields.length + 1), x: Math.round(pt.x), y: Math.round(pt.y), r: 150,
    hue: FIELD_HUES[ctx.layout.fields.length % FIELD_HUES.length] };
  pendingRename = f.id;
  ctx.setSelection({ kind: "field", id: f.id });
  ctx.editLayout((l) => l.fields.push(f));
}
function rename(ctx, id) {
  const label = ctx.fieldEls?.[id]?.querySelector(".flabel");
  if (!label) return;
  label.contentEditable = "true";
  label.focus();
  placeCaretEnd(label);
  const finish = (save) => {
    label.onblur = null;
    label.contentEditable = "false";
    const name = label.textContent.trim();
    if (save && name) ctx.editLayout((l) => { l.fields.find((f) => f.id === id).name = name; });
    else ctx.rerender();
  };
  label.onkeydown = (ev) => {
    ev.stopPropagation();
    if (ev.key === "Enter") { ev.preventDefault(); finish(true); }
    if (ev.key === "Escape") finish(false);
  };
  label.onblur = () => finish(true);
}
function meterRow(name, m, hue) {
  return h("div", { class: "row" }, h("span", {}, name),
    h("span", { class: "meter" }, h("i", { style: { width: (m * 100).toFixed(0) + "%", background: `hsl(${hue} 55% 50%)` } })),
    h("span", { class: "num" }, m.toFixed(2)));
}

export default {
  id: "fuzzy",
  label: "Fuzzy",
  blurb: "Fields overlap; an item belongs to each one by degree, from 0 to 1.",
  spatial: true,
  emptyLayout: () => ({ placements: {}, pan: { x: 0, y: 0 }, fields: [] }),

  hint: () => h("div", { class: "hint" }, h("b", {}, "Fuzzy. "),
    "Add fields, then place items among them. Membership is 1 near a field's centre and fades to 0 at its edge. Drag a field by its name; resize it with its edge dot."),
  toolbar: (ctx) => [h("button", { class: "btn primary", onclick: () => addField(ctx, ctx.viewCentre()) }, "+ Field")],

  layers(ctx) {
    ctx.fieldEls = {};
    return ctx.layout.fields.map((f) => {
      const sel = ctx.selection?.kind === "field" && ctx.selection.id === f.id;
      const el = h("div", { class: "field" + (sel ? " sel" : ""), style: { "--h": f.hue } },
        h("div", { class: "disc" }),
        h("div", { class: "flabel", "data-field": f.id, text: f.name }),
        h("div", { class: "fres", "data-fres": f.id, title: "Drag to resize" }));
      placeField(el, f);
      ctx.fieldEls[f.id] = el;
      return el;
    });
  },
  afterRender(ctx) {
    paintDots(ctx);
    if (pendingRename && ctx.fieldEls[pendingRename]) { const id = pendingRename; pendingRename = null; rename(ctx, id); }
  },
  live: paintDots,

  onPointerDown(e, ctx) {
    const fid = e.target.dataset?.field, rid = e.target.dataset?.fres;
    if (!fid && !rid) return false;
    if (e.target.isContentEditable) return true;
    e.stopPropagation();
    const f = ctx.layout.fields.find((x) => x.id === (fid || rid));
    const el = ctx.fieldEls[f.id];
    const start = { x: f.x, y: f.y, r: f.r };
    drag(e, {
      move: (dx, dy) => {
        if (fid) { f.x = start.x + dx; f.y = start.y + dy; } else f.r = clamp(start.r + dx, 50, 900);
        placeField(el, f);
        paintDots(ctx);
      },
      end: (ev, moved) => {
        if (moved) {
          const next = { x: Math.round(f.x), y: Math.round(f.y), r: Math.round(f.r) };
          Object.assign(f, start);
          ctx.editLayout((l) => Object.assign(l.fields.find((x) => x.id === f.id), next));
        } else if (fid) {
          if (ctx.selection?.kind === "field" && ctx.selection.id === fid) rename(ctx, fid);
          else ctx.select({ kind: "field", id: fid });
        }
      },
    });
    return true;
  },
  onCanvasDblClick(pt, ctx) { addField(ctx, pt); },

  inspector(ctx) {
    const s = ctx.selection;
    if (s?.kind === "item" && ctx.layout.placements[s.id]) {
      const ms = memberships(ctx, s.id);
      return [h("h4", {}, "Membership"), h("div", { class: "subject" }, trunc(ctx.summary(ctx.item(s.id)), 60)),
        ms.length ? ms.map((x) => meterRow(x.f.name, x.m, x.f.hue)) : h("div", { class: "muted" }, "No fields yet. Add one with + Field.")];
    }
    if (s?.kind === "field") {
      const f = ctx.layout.fields.find((x) => x.id === s.id);
      if (!f) return null;
      const members = Object.entries(ctx.pillEls).map(([id, el]) => ({ id, m: degree(f, centreOf(el)) }))
        .filter((x) => x.m > 0.01).sort((a, b) => b.m - a.m);
      return [h("h4", {}, "Field"), h("div", { class: "subject" }, f.name),
        members.length ? members.map((x) => meterRow(trunc(ctx.summary(ctx.item(x.id)), 40), x.m, f.hue))
          : h("div", { class: "muted" }, "Nothing inside this field yet."),
        h("div", { class: "actions" }, h("button", { class: "btn", onclick: () => rename(ctx, f.id) }, "Rename"))];
    }
    return null;
  },
  deleteSelection(ctx) {
    const s = ctx.selection;
    if (s?.kind !== "field") return false;
    const f = ctx.layout.fields.find((x) => x.id === s.id);
    ctx.editLayout((l) => { l.fields = l.fields.filter((x) => x.id !== s.id); }, `Deleted field “${f?.name}”`);
    return true;
  },
};
