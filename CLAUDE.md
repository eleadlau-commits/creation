# Creation — notes for Claude

Read ARCHITECTURE.md before changing anything. It is the map of this project:
layers, folder map, data shape, settings, and plug-in contracts.

## What this is

A personal tool for relating ideas. Rooms (squircles) hold items (pills).
Each room can be viewed in several modes (memo, graph, fuzzy, ...) that share
the same items but never share structure. Plain HTML, CSS and JavaScript
modules: no build step, no framework, no dependencies.

## House rules

- Keep files small and single-purpose (under ~300 lines). Split rather than grow.
- New modes, formats, motions and palettes are plug-ins: a new file under
  `js/plugins/`, registered with one line in `js/plugins.js`. Plug-in CSS goes in
  `css/plugins/` and is linked in `index.html`.
- New settings are one `Settings.define({...})` in `js/settings/definitions.js`.
  The settings drawer builds its controls automatically.
- Room types and flavours are user data, not code. Don't hard-code new ones
  except as starting presets in `js/data/presets.js`.
- UI code changes data only through `Act.*` in `js/data/actions.js`.
- Colours only come from CSS variables (`css/theme.css`). No literal colours in components.
- If the saved data shape changes: bump `CURRENT` in `js/data/migrations.js` and
  add an upgrade step. Never edit an old step. Users' saved work must always load.
- Keep `ARCHITECTURE.md` up to date when files, contracts or the data shape change.
- Interface text speaks to the person using it, in plain words.

## Checking changes

Serve the folder and open it in a browser (modules don't load from file://):

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Check the rooms screen, a room in each mode,
the Settings drawer, and that work survives a reload. Watch the browser console
for errors.

## Working with the owner

- The owner likes to settle the concept before building. For anything beyond a
  small, clear change, describe the plan and wait for agreement first.
- Commit each finished change with a short, plain message.
- The site is published with GitHub Pages from the `main` branch, so whatever is
  pushed to `main` goes live.
