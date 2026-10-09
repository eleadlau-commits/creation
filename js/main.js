// Entry point. Order matters: plug-ins and settings are registered before anything renders.

import "./plugins.js";
import "./settings/definitions.js";
import { Data } from "./data/store.js";
import { migrate } from "./data/migrations.js";
import { sampleWorkspace } from "./data/sample.js";
import { Storage } from "./storage/storage.js";
import { startUI } from "./ui/app.js";

let state = null;
try {
  state = migrate(Storage.load());
} catch (e) {
  console.error("Saved workspace could not be read:", e);
}
const firstRun = !state;
Data.load(state || sampleWorkspace());
if (firstRun) Storage.saveNow(Data.state);

startUI();

// Tidy up image files that no item uses any more.
Storage.blobs.keys().then((keys) => {
  const used = new Set(Object.values(Data.state.items).filter((i) => i.format === "image").map((i) => i.content?.blob));
  keys.filter((k) => !used.has(k)).forEach((k) => Storage.blobs.remove(k));
});
