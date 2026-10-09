// Image items. content = { blob: <id in the blob store>, name: <original file name> }; item.title is editable.
// The picture loads asynchronously; when it arrives the pill fires "itemresize"
// so canvases can re-measure (edges, wrapping, fields).
import { h } from "../../core/dom.js";
import { Storage } from "../../storage/storage.js";

export default {
  id: "image",
  label: "Image",
  editable: false,
  render(item) {
    const img = h("img", { class: "img", alt: item.title || item.content?.name || "Image", draggable: false });
    const id = item.content?.blob;
    Storage.blobs.urlFor(id).then((url) => url || Storage.blobs.remoteUrl?.(id)).then((url) => {
      if (url) {
        img.addEventListener("load", () => img.dispatchEvent(new CustomEvent("itemresize", { bubbles: true })), { once: true });
        img.src = url;
      } else {
        img.replaceWith(h("span", { class: "t missing", text: "Image not found in this browser" }));
      }
    });
    return img;
  },
  summary: (item) => item.title || item.content?.name || "Image",
};
