// The home page: shown every time Creation opens.
// "Log in" shows next to "Create now" only for people who are not signed in.

import { h } from "../core/dom.js";
import { UI } from "./state.js";
import { Account } from "../storage/account.js";

export function buildHomeScreen() {
  const create = h("button", { class: "btn primary big", id: "create-now", onclick: () => UI.go("rooms") }, "Create now");
  UI.after(() => create.focus());
  return h("div", { class: "screen home" },
    h("main", { class: "home-inner" },
      h("h1", { class: "home-title" }, "Creation"),
      h("div", { class: "home-actions" }, create,
        ["idle", "signed-out"].includes(Account.state.status) &&
          h("button", { class: "btn big", id: "log-in", onclick: () => UI.openDrawer("account") }, "Log in"))));
}
