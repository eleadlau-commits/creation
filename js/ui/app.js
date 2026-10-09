// Wires the interface together: which screen to draw, when to redraw, keyboard, feedback.

import { Settings } from "../settings/registry.js";
import { Data } from "../data/store.js";
import { Query } from "../data/actions.js";
import { Storage } from "../storage/storage.js";
import { UI } from "./state.js";
import { Toast, refreshStatus } from "./feedback.js";
import { applyAppTheme } from "./theme.js";
import { buildHomeScreen } from "./home-screen.js";
import { buildRoomsScreen } from "./rooms-screen.js";
import { buildRoomView, roomKeydown } from "./room-view.js";
import { renderDrawer } from "./drawer.js";
import { isTyping } from "../core/dom.js";

function renderMain() {
  if (UI.editingItem) return; // never rebuild under an open editor
  if (UI.screen === "room" && !Query.room(UI.roomId)) UI.screen = "rooms";
  applyAppTheme(Settings.forApp(Data.state));
  const view = UI.screen === "home" ? buildHomeScreen()
    : UI.screen === "room" ? buildRoomView(Query.room(UI.roomId)) : buildRoomsScreen();
  document.getElementById("app").replaceChildren(view);
  UI.flushAfter();
}

export function startUI() {
  UI.renderMain = renderMain;
  UI.renderDrawer = renderDrawer;
  Data.onUndoable = (label, undo) => Toast.show(label, undo);
  Storage.onStatus = refreshStatus;
  Data.subscribe((replaced) => {
    if (replaced) UI.selection = null;
    UI.render();
    if (replaced) UI.renderDrawer();
  });
  document.addEventListener("keydown", (e) => {
    if (isTyping()) return;
    if (e.key === "Escape" && UI.drawer.open && !UI.selection) { UI.drawer.open = false; renderDrawer(); return; }
    roomKeydown(e);
  });
  UI.render();
  UI.renderDrawer();
}
