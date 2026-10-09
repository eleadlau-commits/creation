# Creation — architecture

This file is the map of the codebase. When asking an AI (or yourself) to change
something, share this file plus only the files the change touches.

Plain HTML, CSS and JavaScript modules. No build step, no framework, no
dependencies: edit a file, refresh the browser.

## Layers

Each layer only uses the layers above it in this list.

| Layer | Folder | Job |
|---|---|---|
| Core | `js/core/` | Utilities, plug-in registries, squircle geometry |
| Storage | `js/storage/` | Where data lives (IndexedDB: workspace, item history, image files) |
| Data | `js/data/` | The workspace state, how it changes, how old data upgrades |
| Settings | `js/settings/` | Declared settings and how values are inherited |
| Plug-ins | `js/plugins/` | Modes, formats, motions, palettes |
| UI | `js/ui/` | Screens, drawer, pills, canvas |

`js/main.js` starts everything. `js/plugins.js` is the plug-in manifest.

## Folder map

```
index.html                 page shell; links every CSS file and js/main.js
firestore.rules            database security rules (paste into the Firebase console)
storage.rules              image storage security rules (paste into the Firebase console)
docs/firebase-setup.md     step-by-step Firebase setup for the owner
css/
  theme.css                colour and font tokens (light + dark)
  base.css                 frame, bars, buttons, settings drawer, toast
  home.css                 the home page
  rooms.css                the rooms screen
  room.css                 inside a room: pills, shelf, selection bar
  details.css              the item details panel and the pill's "has more" dot
  plugins/<name>.css       styles that belong to one plug-in (graph, fuzzy, room-chip)
js/
  main.js                  boot: register plug-ins, load data, start UI
  plugins.js               THE MANIFEST: import + register every plug-in
  core/dom.js              h(), svg(), drag(), afterPointer(), small helpers
  core/registry.js         Modes, Formats, Motions, Palettes registries
  core/squircle.js         squircle path from width, height, roundness
  storage/storage.js       facade used by the rest of the app (load is async)
  storage/idb.js           shared IndexedDB helper: database "creation", stores workspace + history
  storage/workspace-idb.js workspace adapter (IndexedDB); moves the old localStorage copy over once
  storage/local.js         old workspace adapter (localStorage), kept as a fallback
  storage/history-store.js item history adapter (IndexedDB), keyed by item id
  storage/blobs.js         image adapter (IndexedDB, database "creation-files")
  storage/firebase-config.js  Firebase web config (public by design) and the pinned SDK version
  storage/account.js       sign in/out (Firebase Auth from the CDN, loaded only when needed)
  data/store.js            Data: state, commit(), undo, subscribe
  data/actions.js          Query (read) and Act (change)
  data/migrations.js       data shape, version number, upgrade steps
  data/nesting.js          rooms inside rooms: helpers and the consistency check
  data/history.js          item history: record (5-minute merge, max 50), list, restore
  data/stamps.js           stamps updatedAt on changed rooms, items and layouts before each save
  data/presets.js          starting room types and flavours
  data/sample.js           first-run sample workspace
  settings/registry.js     Settings engine: define, resolve, inherit
  settings/definitions.js  EVERY SETTING, declared once
  plugins/modes/*.js       memo, graph, fuzzy
  plugins/formats/*.js     text, image, room (a room inside a room)
  plugins/motions/*.js     still, bob, drift
  plugins/palettes.js      named colour palettes
  ui/app.js                render loop, keyboard
  ui/state.js              interface state (screen: home | rooms | room, selection, drawer)
  ui/home-screen.js        home page: title and "Create now" (every visit starts here)
  ui/rooms-screen.js       squircle rooms
  ui/room-view.js          inside a room; builds the mode `ctx`
  ui/canvas.js             spatial canvas shared by spatial modes
  ui/shelf.js              the shelf, composer, image upload
  ui/pill.js               how an item is drawn and edited; double-click opens details
  ui/details.js            item details panel: title, note, sources, origin (own root, #details-root)
  ui/history-list.js       the History section of the details panel
  ui/drawer.js             settings drawer and its tabs
  ui/controls.js           setting controls generated from definitions
  ui/data-panel.js         backup download / import
  ui/account-panel.js      Settings → Account: sign in with Google or an email link, sign out
  ui/theme.js              settings -> CSS variables
  ui/feedback.js           save status, undo toast
```

## Words

- **Room**: holds items. A top-level room is a squircle on the rooms screen; a room
  inside another room is an item there (a room chip). Each room is in exactly one place.
- **Room type**: a named preset of room settings (e.g. Project, Floating).
- **Item**: one thing inside a room, drawn as a pill. Text and image items also have a
  note, sources and an origin, edited in the details panel (double-click, or Details).
- **Format**: what an item's content is: `text`, `image`, `room`.
- **Flavour**: a named preset of item settings: a kind of idea (Hunch, Question).
- **Mode**: a way of arranging a room's items (memo, graph, fuzzy).
- **Layout**: one room's arrangement in one mode. Never shared between modes.
- **Shelf**: items with no placement in the current layout. Not stored.

## Data

The full shape is documented at the top of `js/data/migrations.js`.

**Rooms inside rooms.** A room inside another room is an item there with format
`room` and `content: { roomId }`. That item is the source of truth; `room.parentId`
mirrors it (null at the top level). Only these change nesting, and they keep both
in step: `Act.addChildRoom`, `Act.groupRooms`, `Act.moveRoomOut`, `Act.deleteRoom`
(ordinary items are deleted, rooms inside move up a level). `checkNesting()` in
`js/data/nesting.js` runs on every load and import and repairs anything that
disagrees. Settings are not inherited from the parent room.

**Rich items.** Text and image items carry `note`, `sources` ([{ id, label, url,
locator }]) and `origin` ({ at: "YYYY-MM-DD" | null, context }). A text item's title
is its `content`; an image item has its own `title`. New items get these from
`richDefaults()` in `migrations.js`. Deliberately no tags.

**History** is stored apart from the workspace (`Storage.history`, IndexedDB) and is
not part of the saved state shape, so it needs no migration step. `Act.updateItem`
records a version after every finished edit of the title, note, sources or origin
(`js/data/history.js`): edits within 5 minutes merge into the last version, the
first version (how the item was before its first edit) is always kept, and an item
keeps at most 50. Restoring (`Act.restoreVersion`) adds a new version. History is
read only when a details panel opens, is included in backups, and history of
deleted items is tidied away the next time Creation opens.

**updatedAt.** Rooms, items and layouts carry `updatedAt` (ms). Actions don't set it:
`js/data/stamps.js` compares records with how they were at the last save and stamps
the changed ones just before saving. Syncing (Phase 3) uses it: latest change wins.

**Accounts** are optional. `js/storage/account.js` loads Firebase Auth from the CDN
(version pinned in `firebase-config.js`) only when the Account tab opens, an email
sign-in link is opened, or the person was signed in last time. Setting
`firebaseConfig` to null switches accounts off. Security comes from
`firestore.rules` / `storage.rules`: each person can only reach `users/{their uid}`.
All changes go through `Data.commit(fn, undoLabel?)`, usually via `Act.*`.

**Changing the data shape:** bump `CURRENT` in `migrations.js` and add a step
that converts the previous version. Never edit an old step.

## Settings

Declared in `js/settings/definitions.js`:

```js
Settings.define({ key, target, group, label, type, default, ...options });
```

- `target: "app"` — global only.
- `target: "room"` — global → room type → single room.
- `target: "item"` — global → flavour.
- `type`: `select` (with `options`), `range` (`min`, `max`, `step`), `hue`, `color`, `text` (`maxLength`).

The most specific value that is set wins. Read values with
`Settings.forApp(state)`, `Settings.forRoom(state, room)`, `Settings.forItem(state, item)`.

**Add a setting:** one `Settings.define` call, then use the value where it
takes effect (`ui/theme.js` for colours, `ui/rooms-screen.js` for rooms,
`ui/pill.js` for items). The drawer shows it automatically.

## Plug-in contracts

Every plug-in is a plain object exported as `default`, registered in `js/plugins.js`.

### Mode (`js/plugins/modes/`)

```js
{
  id, label, blurb,
  spatial,                    // false = shelf fills the room (memo)
  emptyLayout(),              // { placements: {}, pan: {x, y}, ...own data }
  hint(ctx),                  // optional: help text node on the canvas
  toolbar(ctx),               // optional: array of buttons
  layers(ctx),                // optional: nodes drawn under the items
  decorate(el, item, ctx),    // optional: add to a placed pill
  afterRender(ctx),           // optional: after mount (sizes are measurable)
  live(ctx),                  // optional: while something is dragged
  onPointerDown(e, ctx),      // optional: return true if handled
  onCanvasDblClick(pt, ctx),  // optional: pt in canvas coordinates
  inspector(ctx),             // optional: nodes for the side panel, or null
  deleteSelection(ctx),       // optional: delete mode-specific selections
  onItemDeleted(layout, id),  // optional: tidy own data when an item goes
}
```

`ctx` gives a mode: `room, mode, layout, items, pillEls, selection, viewport, world,
select(sel), setSelection(sel), rerender(), editLayout(fn, undoLabel), toWorld(x, y),
viewCentre(), newItemAt(pt), item(id), summary(item)`.

**Add a mode:** new file in `js/plugins/modes/`, optional CSS in
`css/plugins/`, one import + register line in `js/plugins.js`, one `<link>`
in `index.html` if it has CSS.

### Format (`js/plugins/formats/`)

```js
{
  id, label, editable,
  render(item) -> Node | Node[],
  summary(item) -> string,
  look(item),          // optional: { class, style }; replaces item settings and flavours
  open(item, go),      // optional: what double-click / Enter does instead of editing; go(screen, id)
  rename(item),        // optional: { value, room } to edit a name in place instead of the content
}
```

### Motion (`js/plugins/motions/`)

```js
{ id, label, keyframes?: "CSS @keyframes text", apply(el, strength 0–100, seed 0–1) }
```

Motions are switched off automatically for reduced-motion users.

### Palette (`js/plugins/palettes.js`)

```js
{ id, label, scheme: "light" | "dark", tokens: { "--ground": "#...", ... } }
```

Give every token listed in `css/theme.css`.

## Conventions

- Keep files small and single-purpose. If a file passes ~300 lines, split it.
- UI never edits `Data.state` directly; it calls `Act.*`.
- Colours only come from CSS variables, never hard-coded in components.
- Interface text speaks to the person using it ("Delete room"), not about the code.

## Changing things with an AI

1. Share `ARCHITECTURE.md` and the files you expect to change.
2. Ask for complete replacement files with their paths.
3. Drop them into the folder, refresh, then commit with git.
