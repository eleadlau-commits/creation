// The shelf: unplaced items, oldest first. In memo mode it fills the room.
// New items (text or images) always arrive here.

import { h, drag, clamp } from "../core/dom.js";
import { Act, Query } from "../data/actions.js";
import { Storage } from "../storage/storage.js";
import { UI, Prefs } from "./state.js";
import { makePill } from "./canvas.js";
import { editItem } from "./pill.js";
import { Toast } from "./feedback.js";

export async function addImages(roomId, files) {
  const images = [...files].filter((f) => f.type.startsWith("image/"));
  for (const file of images) {
    try {
      const blob = await Storage.blobs.put(file);
      Act.addItem(roomId, { format: "image", content: { blob, name: file.name || "Pasted image" } });
    } catch {
      Toast.show("Couldn't store that image. The browser may be out of space.");
    }
  }
  return images.length;
}

export function buildShelf(ctx, list, { full }) {
  const roomId = ctx.room.id;
  const input = h("input", { id: "composer", placeholder: full ? "Write something and press Enter" : "New item for the shelf",
    autocomplete: "off", "aria-label": "New item" });
  const add = () => {
    const value = input.value.trim();
    if (!value) return;
    UI.focusComposer = true;
    Act.addItem(roomId, { content: value });
  };
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } });
  input.addEventListener("paste", async (e) => {
    const files = e.clipboardData?.files;
    if (files?.length && (await addImages(roomId, files))) e.preventDefault();
  });
  const newRoom = () => {
    const room = Act.addChildRoom(roomId);
    const it = Query.roomItemOf(room.id);
    UI.selection = { kind: "item", id: it.id };
    UI.after(() => { const el = document.querySelector(`.pill[data-id="${it.id}"]`); if (el) editItem(el, it); });
    UI.render();
  };
  const file = h("input", { type: "file", accept: "image/*", multiple: true, hidden: true, id: "image-input",
    onchange: () => addImages(roomId, file.files) });

  const itemsBox = h("div", { class: "shelf-items" },
    list.length ? list.map((item) => makePill(ctx, item))
      : h("div", { class: "none" }, full ? "Nothing here yet. Write the first thing below, or drop in an image." : "Everything is placed. New items arrive here."));
  const head = h("div", { class: "shelf-head" },
    h("h3", {}, full ? "Memo" : "Shelf"),
    h("span", {}, full ? `${list.length} ${list.length === 1 ? "item" : "items"}, oldest first` : `${list.length} unplaced`));

  const el = h("div", { class: "shelf" + (full ? " full" : "") });
  if (!full) {
    const grip = h("div", { class: "grip", title: "Drag to resize the shelf", role: "separator", "aria-orientation": "horizontal" });
    el.style.height = UI.shelfH + "px";
    grip.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      const startH = UI.shelfH, max = el.parentElement.clientHeight - 60;
      drag(e, { threshold: 0,
        move: (dx, dy) => { UI.shelfH = clamp(startH - dy, 90, max); el.style.height = UI.shelfH + "px"; },
        end: () => Prefs.set("shelfH", UI.shelfH) });
    });
    el.append(grip);
  }
  // Drop image files from the computer onto the shelf.
  el.addEventListener("dragover", (e) => { if (e.dataTransfer?.types?.includes("Files")) { e.preventDefault(); el.classList.add("drop-target"); } });
  el.addEventListener("dragleave", () => el.classList.remove("drop-target"));
  el.addEventListener("drop", (e) => { e.preventDefault(); el.classList.remove("drop-target"); addImages(roomId, e.dataTransfer.files); });

  el.append(head, itemsBox, h("div", { class: "composer" },
    input,
    h("button", { class: "btn", onclick: () => file.click(), title: "Add images" }, "Image"),
    h("button", { class: "btn", id: "new-room-here", onclick: newRoom, title: "A new room inside this one" }, "Room"),
    h("button", { class: "btn primary", onclick: add }, "Add"),
    file));

  if (UI.focusComposer) {
    UI.focusComposer = false;
    UI.after(() => { input.focus(); itemsBox.scrollTop = itemsBox.scrollHeight; });
  }
  return el;
}
