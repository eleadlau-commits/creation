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
| Storage | `js/storage/` | Where data lives (browser storage + image files) |
| Data | `js/data/` | The workspace state, how it changes, how old data upgrades |
| Settings | `js/settings/` | Declared settings and how values are inherited |
| Plug-ins | `js/plugins/` | Modes, formats, motions, palettes |
| UI | `js/ui/` | Screens, drawer, pills, canvas |

`js/main.js` starts everything. `js/plugins.js` is the plug-in manifest.

## Folder map

```
index.html                 page shell; links every CSS file and js/main.js
css/
  theme.css                colour and font tokens (light + dark)
  base.css                 frame, bars, buttons, settings drawer, toast
  rooms.css                the rooms screen
  room.css                 inside a room: pills, shelf, selection bar
  plugins/<name>.css       styles that belong to one plug-in
js/
  main.js                  boot: register plug-ins, load data, start UI
  plugins.js               THE MANIFEST: import + register every plug-in
  core/dom.js              h(), svg(), drag(), small helpers
  core/registry.js         Modes, Formats, Motions, Palettes registries
  core/squircle.js         squircle path from width, height, roundness
  storage/storage.js       facade used by the rest of the app
  storage/local.js         workspace adapter (localStorage)
  storage/blobs.js         image adapter (IndexedDB)
  data/store.js            Data: state, commit(), undo, subscribe
  data/actions.js          Query (read) and Act (change)
  data/migrations.js       data shape, version number, upgrade steps
  data/presets.js          starting room types and flavours
  data/sample.js           first-run sample workspace
  settings/registry.js     Settings engine: define, resolve, inherit
  settings/definitions.js  EVERY SETTING, declared once
  plugins/modes/*.js       memo, graph, fuzzy
  plugins/formats/*.js     text, image
  plugins/motions/*.js     still, bob, drift
  plugins/palettes.js      named colour palettes
  ui/app.js                render loop, keyboard
  ui/state.js              interface state (screen, selection, drawer)
  ui/rooms-screen.js       squircle rooms
  ui/room-view.js          inside a room; builds the mode `ctx`
  ui/canvas.js             spatial canvas shared by spatial modes
  ui/shelf.js              the shelf, composer, image upload
  ui/pill.js               how an item is drawn and edited
  ui/drawer.js             settings drawer and its tabs
  ui/controls.js           setting controls generated from definitions
  ui/data-panel.js         backup download / import
  ui/theme.js              settings -> CSS variables
  ui/feedback.js           save status, undo toast
```

## Words

- **Room**: a squircle on the first screen. Holds items.
- **Room type**: a named preset of room settings (e.g. Project, Floating).
- **Item**: one thing inside a room, drawn as a pill.
- **Format**: what an item's content is: `text`, `image`.
- **Flavour**: a named preset of item settings: a kind of idea (Hunch, Question).
- **Mode**: a way of arranging a room's items (memo, graph, fuzzy).
- **Layout**: one room's arrangement in one mode. Never shared between modes.
- **Shelf**: items with no placement in the current layout. Not stored.

## Data

The full shape is documented at the top of `js/data/migrations.js`.
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
{ id, label, editable, render(item) -> Node, summary(item) -> string }
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
