// Graph mode: items are nodes, meaning lives in the links between them.
// Layout data: { placements, pan, edges: [{ id, a, b }] }
import { h, svg, drag, uid, trunc } from "../../core/dom.js";

const centre = (ctx, id) => {
  const el = ctx.pillEls[id];
  return el ? { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 } : null;
};
const curve = (a, b) => {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, k = 0.12;
  return `M${a.x} ${a.y}Q${mx - (b.y - a.y) * k} ${my + (b.x - a.x) * k} ${b.x} ${b.y}`;
};

function drawEdges(ctx) {
  const layer = ctx.edgeLayer;
  if (!layer) return;
  layer.replaceChildren();
  for (const e of ctx.layout.edges) {
    const a = centre(ctx, e.a), b = centre(ctx, e.b);
    if (!a || !b) continue;
    const d = curve(a, b);
    const sel = ctx.selection?.kind === "edge" && ctx.selection.id === e.id;
    layer.append(svg("path", { class: "e" + (sel ? " sel" : ""), d }));
    layer.append(svg("path", { class: "hit", d, "data-edge": e.id }));
  }
}

export default {
  id: "graph",
  label: "Graph",
  blurb: "Items are nodes; meaning lives in the links between them.",
  spatial: true,
  emptyLayout: () => ({ placements: {}, pan: { x: 0, y: 0 }, edges: [] }),

  hint: () => h("div", { class: "hint" }, h("b", {}, "Graph. "),
    "Drag items up from the shelf. Drag from a node's dot onto another node to link them. Double-click empty space to write a new node."),

  layers(ctx) {
    ctx.edgeLayer = svg("svg", { class: "edges" });
    return [ctx.edgeLayer];
  },
  decorate(el, item, ctx) {
    if (ctx.layout.placements[item.id]) el.append(h("span", { class: "handle", title: "Drag to another node to link" }));
  },
  afterRender: drawEdges,
  live: drawEdges,

  onPointerDown(e, ctx) {
    const edgeId = e.target.getAttribute?.("data-edge");
    if (edgeId) { ctx.select({ kind: "edge", id: edgeId }); return true; }
    if (!e.target.classList?.contains("handle")) return false;
    e.stopPropagation();
    const from = e.target.closest(".pill").dataset.id;
    const a = centre(ctx, from);
    const temp = svg("path", { class: "temp" });
    ctx.edgeLayer.append(temp);
    drag(e, {
      threshold: 0,
      move: (dx, dy, ev) => { const p = ctx.toWorld(ev.clientX, ev.clientY); temp.setAttribute("d", `M${a.x} ${a.y}L${p.x} ${p.y}`); },
      end: (ev) => {
        temp.remove();
        const to = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".world .pill")?.dataset.id;
        if (!to || to === from) return;
        const exists = ctx.layout.edges.some((x) => (x.a === from && x.b === to) || (x.a === to && x.b === from));
        if (!exists) ctx.editLayout((l) => l.edges.push({ id: uid("edge"), a: from, b: to }));
      },
    });
    return true;
  },
  onCanvasDblClick(pt, ctx) { ctx.newItemAt(pt); },

  inspector(ctx) {
    const s = ctx.selection;
    const name = (id) => trunc(ctx.summary(ctx.item(id)), 44);
    if (s?.kind === "edge") {
      const e = ctx.layout.edges.find((x) => x.id === s.id);
      return e ? [h("h4", {}, "Link"), h("div", { class: "subject" }, name(e.a), " — ", name(e.b))] : null;
    }
    if (s?.kind === "item" && ctx.layout.placements[s.id]) {
      const links = ctx.layout.edges.filter((x) => x.a === s.id || x.b === s.id);
      return [
        h("h4", {}, "Node"),
        h("div", { class: "muted" }, links.length ? `Linked to ${links.length} ${links.length === 1 ? "item" : "items"}:` : "No links yet. Drag from its dot to another node."),
        ...links.map((x) => h("div", { class: "muted" }, "· " + name(x.a === s.id ? x.b : x.a))),
      ];
    }
    return null;
  },
  deleteSelection(ctx) {
    const s = ctx.selection;
    if (s?.kind !== "edge") return false;
    ctx.editLayout((l) => { l.edges = l.edges.filter((x) => x.id !== s.id); }, "Deleted link");
    return true;
  },
  onItemDeleted(layout, id) {
    layout.edges = (layout.edges || []).filter((x) => x.a !== id && x.b !== id);
  },
};
