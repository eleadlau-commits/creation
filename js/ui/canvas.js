// The spatial canvas shared by every spatial mode (graph, fuzzy, ...).
// It owns panning, placing pills, dragging between shelf and canvas, and text
// wrapping. Modes add their own layers and behaviour through the mode contract.

import { h, drag } from "../core/dom.js";
import { Data } from "../data/store.js";
import { UI } from "./state.js";
import { pillEl, editItem } from "./pill.js";

export function makePill(ctx, item) {
  const selected = ctx.selection?.kind === "item" && ctx.selection.id === item.id;
  return pillEl(item, {
    selected,
    onSelect: () => ctx.select({ kind: "item", id: item.id }),
    onDragStart: (e, el) => startItemDrag(e, el, item, ctx),
  });
}

export function buildCanvas(ctx) {
  const { layout, mode } = ctx;
  const world = h("div", { class: "world" });
  const viewport = h("div", { class: "plane viewport" }, world);
  ctx.viewport = viewport;
  ctx.world = world;
  const setPan = () => { world.style.transform = `translate(${layout.pan.x}px, ${layout.pan.y}px)`; };
  setPan();

  for (const node of mode.layers?.(ctx) || []) world.append(node);
  for (const item of ctx.items) {
    const p = layout.placements[item.id];
    if (!p) continue;
    const el = makePill(ctx, item);
    el.style.left = p.x + "px";
    el.style.top = p.y + "px";
    mode.decorate?.(el, item, ctx);
    ctx.pillEls[item.id] = el;
    world.append(el);
  }

  viewport.addEventListener("pointerdown", (e) => {
    if (mode.onPointerDown?.(e, ctx)) return;
    if (e.target !== viewport && e.target !== world && !e.target.closest("svg.edges")) return;
    const start = { ...layout.pan };
    viewport.classList.add("panning");
    drag(e, {
      move: (dx, dy) => { layout.pan = { x: start.x + dx, y: start.y + dy }; setPan(); },
      end: (ev, moved) => {
        viewport.classList.remove("panning");
        if (moved) Data.quiet();
        else if (UI.selection) ctx.select(null);
      },
    });
  });
  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    layout.pan.x -= e.deltaX;
    layout.pan.y -= e.deltaY;
    setPan();
    Data.quiet();
  }, { passive: false });
  viewport.addEventListener("dblclick", (e) => {
    if (e.target !== viewport && e.target !== world) return;
    mode.onCanvasDblClick?.(ctx.toWorld(e.clientX, e.clientY), ctx);
  });
  // An image finished loading and changed size: re-measure.
  world.addEventListener("itemresize", () => { wrapPills(ctx); mode.live?.(ctx); });

  viewport.append(h("div", { class: "modebar" }, mode.hint?.(ctx), mode.toolbar?.(ctx)));
  const inspector = h("div", { class: "inspector", hidden: true, onpointerdown: (e) => e.stopPropagation() });
  viewport.append(inspector);
  if (!Object.keys(layout.placements).length && ctx.items.length) {
    viewport.append(h("div", { class: "empty-note" }, h("b", {}, "Nothing placed yet"),
      `Every item starts on the shelf in a new mode. Drag items up here to arrange them as a ${mode.label.toLowerCase()}.`));
  }

  // Runs once the canvas is in the document, so sizes can be measured.
  UI.after(() => {
    wrapPills(ctx);
    mode.afterRender?.(ctx);
    const content = mode.inspector?.(ctx);
    if (content) {
      inspector.replaceChildren(...[content].flat(Infinity).filter(Boolean));
      inspector.hidden = false;
    }
  });
  return viewport;
}

/** Text stays on one line until it would run into another item to its right. */
export function wrapPills(ctx) {
  const boxes = Object.values(ctx.pillEls).map((el) => {
    el.classList.remove("wrapped");
    el.style.width = "";
    return { el, x: el.offsetLeft, y: el.offsetTop, h: el.offsetHeight };
  });
  for (const b of boxes) {
    if (b.el.classList.contains("image")) continue;
    let limit = Infinity;
    for (const o of boxes) {
      if (o === b || o.x <= b.x + 20) continue;
      if (o.y < b.y + b.h && o.y + o.h > b.y) limit = Math.min(limit, o.x - b.x - 12);
    }
    if (limit !== Infinity && b.el.offsetWidth > limit) {
      b.el.style.width = Math.max(limit, 110) + "px";
      b.el.classList.add("wrapped");
    }
  }
}

/** Drag an item: within the canvas, from shelf to canvas, or from canvas back to the shelf. */
export function startItemDrag(e, el, item, ctx) {
  if (el.classList.contains("editing") || e.target.classList.contains("handle")) return;
  e.stopPropagation();
  const spatial = ctx.mode.spatial;
  const onCanvas = !!el.closest(".world");
  const rect = el.getBoundingClientRect();
  const off = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  const shelf = document.querySelector(".shelf");
  const start = onCanvas ? { ...ctx.layout.placements[item.id] } : null;
  let ghost = null;
  const inside = (r, ev) => r && ev.clientY >= r.top && ev.clientY <= r.bottom && ev.clientX >= r.left && ev.clientX <= r.right;
  const overShelf = (ev) => inside(shelf?.getBoundingClientRect(), ev);
  const overCanvas = (ev) => inside(ctx.viewport?.getBoundingClientRect(), ev) && !overShelf(ev);

  drag(e, {
    move: (dx, dy, ev) => {
      if (!spatial) return;
      if (onCanvas) {
        el.style.left = start.x + dx + "px";
        el.style.top = start.y + dy + "px";
        el.style.zIndex = 5;
        ctx.mode.live?.(ctx);
      } else {
        if (!ghost) {
          ghost = el.cloneNode(true);
          ghost.classList.add("ghost");
          ghost.classList.remove("sel");
          ghost.style.width = rect.width + "px";
          document.body.append(ghost);
          el.classList.add("lifted");
        }
        ghost.style.left = ev.clientX - off.x + "px";
        ghost.style.top = ev.clientY - off.y + "px";
      }
      shelf?.classList.toggle("drop-target", onCanvas && overShelf(ev));
    },
    end: (ev, moved) => {
      ghost?.remove();
      el.classList.remove("lifted");
      shelf?.classList.remove("drop-target");
      if (!moved) {
        if (ctx.selection?.kind === "item" && ctx.selection.id === item.id) editItem(el, item);
        else ctx.select({ kind: "item", id: item.id });
        return;
      }
      if (!spatial) return;
      if (onCanvas && overShelf(ev)) { ctx.editLayout((l) => { delete l.placements[item.id]; }); return; }
      if (overCanvas(ev)) {
        const p = ctx.toWorld(ev.clientX - off.x, ev.clientY - off.y);
        ctx.editLayout((l) => { l.placements[item.id] = { x: Math.round(p.x), y: Math.round(p.y) }; });
        return;
      }
      UI.render();
    },
  });
}
