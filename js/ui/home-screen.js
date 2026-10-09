// The home page: shown every time Creation opens.
// Phase 3 adds a "Log in" button here for people who are not signed in.

import { h } from "../core/dom.js";
import { UI } from "./state.js";

export function buildHomeScreen() {
  const create = h("button", { class: "btn primary big", id: "create-now", onclick: () => UI.go("rooms") }, "Create now");
  UI.after(() => create.focus());
  return h("div", { class: "screen home" },
    h("main", { class: "home-inner" },
      h("h1", { class: "home-title" }, "Creation"),
      h("div", { class: "home-actions" }, create)));
}
