// THE PLUG-IN MANIFEST. To add a mode, format, motion or palette:
//   1. create its file under js/plugins/
//   2. import it here and register it (one line each)
// Order in each list = order shown in the app.

import { Modes, Formats, Motions, Palettes } from "./core/registry.js";

import memo from "./plugins/modes/memo.js";
import graph from "./plugins/modes/graph.js";
import fuzzy from "./plugins/modes/fuzzy.js";

import text from "./plugins/formats/text.js";
import image from "./plugins/formats/image.js";
import room from "./plugins/formats/room.js";

import still from "./plugins/motions/none.js";
import bob from "./plugins/motions/bob.js";
import drift from "./plugins/motions/drift.js";

import palettes from "./plugins/palettes.js";

[memo, graph, fuzzy].forEach((m) => Modes.register(m));
[text, image, room].forEach((f) => Formats.register(f));
[still, bob, drift].forEach((m) => Motions.register(m));
palettes.forEach((p) => Palettes.register(p));
