// Mode contract (see ARCHITECTURE.md for the full list and the ctx object):
// { id, label, blurb, spatial, emptyLayout(), hint?(ctx), toolbar?(ctx), layers?(ctx),
//   decorate?(el, item, ctx), afterRender?(ctx), live?(ctx), onPointerDown?(e, ctx),
//   onCanvasDblClick?(pt, ctx), inspector?(ctx), deleteSelection?(ctx), onItemDeleted?(layout, itemId) }
//
// Memo is the non-spatial mode: the shelf fills the whole room.
export default {
  id: "memo",
  label: "Memo",
  blurb: "No relations. Just capture, in the order you wrote things.",
  spatial: false,
  emptyLayout: () => ({ placements: {}, pan: { x: 0, y: 0 } }),
};
