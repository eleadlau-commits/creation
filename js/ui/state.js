// Interface state that is NOT part of the saved workspace (which screen is open,
// what is selected, whether the settings drawer is open). A few prefs are remembered per browser.

const PREFS_KEY = "creation.ui";

export const Prefs = {
  data: (() => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } })(),
  set(key, value) {
    this.data[key] = value;
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(this.data)); } catch { /* private mode */ }
  },
};

export const UI = {
  screen: "home", // "home" | "rooms" | "room"; every visit starts at home
  roomId: null,
  selection: null, // { kind: "item" | "edge" | "field", id }
  drawer: { open: false, tab: "everywhere", expanded: null },
  shelfH: Prefs.data.shelfH || 190,
  editingItem: null, // while an item is being edited, re-rendering is paused
  focusComposer: false,
  renameRoomId: null,
  details: null, // id of the item whose details panel is open
  picking: null, // rooms screen: a Set of room ids while choosing rooms to group
  _after: [],

  // Filled in by ui/app.js
  renderMain: () => {},
  renderDrawer: () => {},
  renderDetails: () => {},

  render() { this.renderMain(); },
  /** Run fn once, right after the next render has put the new DOM in place. */
  after(fn) { this._after.push(fn); },
  flushAfter() { const list = this._after; this._after = []; list.forEach((fn) => fn()); },

  go(screen, roomId = null) {
    this.screen = screen;
    this.roomId = roomId;
    this.selection = null;
    this.picking = null;
    this.details = null;
    if (screen === "rooms" && this.drawer.tab === "room") this.drawer.tab = "everywhere";
    this.render();
    this.renderDrawer();
    this.renderDetails();
  },
  openDrawer(tab) {
    this.drawer.open = true;
    if (this.details) { this.details = null; this.renderDetails(); }
    if (tab) this.drawer.tab = tab;
    this.renderDrawer();
  },
};
