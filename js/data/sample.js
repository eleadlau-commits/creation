// The sample workspace shown on first run. Marked with sample: true so the
// rooms screen can offer "Start empty".

import { uid } from "../core/dom.js";
import { emptyState, richDefaults } from "./migrations.js";

export function sampleWorkspace() {
  const s = emptyState();
  s.sample = true;
  const start = Date.now() - 86400000 * 3;
  let t = 0;
  const room = (name, x, y, w, h, hue, extra = {}) => {
    const r = { id: uid("room"), name, x, y, w, h, hue, typeId: null, settings: {}, modeSwitching: false, mode: "memo", parentId: null, createdAt: start + (t += 1000), ...extra };
    s.rooms[r.id] = r;
    return r;
  };
  const item = (r, content, flavourId = null) => {
    const i = { id: uid("item"), roomId: r.id, format: "text", flavourId, content, createdAt: start + (t += 60000), ...richDefaults({}) };
    s.items[i.id] = i;
    return i.id;
  };

  const proust = room("Proust’s metaphors", 30, 40, 320, 230, 205, { modeSwitching: true, mode: "graph" });
  const mad = item(proust, "Madeleine dipped in tea", "flav_quote");
  const inv = item(proust, "Involuntary memory");
  const mar = item(proust, "The steeples of Martinville");
  const tim = item(proust, "Time as a dimension of space", "flav_hunch");
  item(proust, "Sleep as a descent through rooms");
  const alb = item(proust, "Albertine as the sea");
  const jea = item(proust, "Is jealousy a kind of surveillance?", "flav_question");
  item(proust, "Hawthorn blossoms");
  const lan = item(proust, "The magic lantern");
  s.layouts[proust.id + ":graph"] = {
    pan: { x: 0, y: 0 },
    placements: { [mad]: { x: 70, y: 150 }, [inv]: { x: 340, y: 90 }, [mar]: { x: 110, y: 310 }, [tim]: { x: 470, y: 240 }, [lan]: { x: 360, y: 400 } },
    edges: [{ id: uid("edge"), a: mad, b: inv }, { id: uid("edge"), a: mar, b: tim }, { id: uid("edge"), a: inv, b: tim }, { id: uid("edge"), a: lan, b: tim }],
  };
  s.layouts[proust.id + ":fuzzy"] = {
    pan: { x: 0, y: 0 },
    fields: [
      { id: uid("field"), name: "Memory", x: 270, y: 240, r: 190, hue: 212 },
      { id: uid("field"), name: "Space", x: 540, y: 280, r: 170, hue: 150 },
      { id: uid("field"), name: "Desire", x: 340, y: 480, r: 160, hue: 330 },
    ],
    placements: { [mad]: { x: 150, y: 210 }, [tim]: { x: 340, y: 270 }, [alb]: { x: 300, y: 440 }, [mar]: { x: 480, y: 320 }, [jea]: { x: 210, y: 545 } },
  };

  const naming = room("Naming beyond sets", 400, 20, 230, 230, 36, { typeId: "rtype_project" });
  item(naming, "Name things by what stays invariant, not by membership");
  item(naming, "A word for what survives a transformation", "flav_hunch");
  item(naming, "Relation-first nouns");
  item(naming, "Can geometry be a grammar?", "flav_question");

  const inbox = room("Inbox", 430, 300, 170, 130, 268, { typeId: "rtype_floating" });
  item(inbox, "Iceberg mode?", "flav_question");
  item(inbox, "Rooms as places, not categories");

  const think = room("How I think", 40, 320, 340, 150, 96);
  item(think, "Tip-of-the-iceberg intuitions", "flav_hunch");
  item(think, "An idea tied to others I can't recall yet");
  item(think, "Abstract the skill, keep the self");
  return s;
}
