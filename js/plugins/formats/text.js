// Format contract:
// { id, label,
//   render(item) -> Node          what appears inside the pill
//   summary(item) -> string       one line of text for bars, lists and inspectors
//   editable: boolean             can be edited in place (text-like content) }
import { h } from "../../core/dom.js";

export default {
  id: "text",
  label: "Text",
  editable: true,
  render: (item) => h("span", { class: "t", text: item.content }),
  summary: (item) => String(item.content ?? ""),
};
