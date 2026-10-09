// Core utilities shared by every layer. No imports, no app knowledge.

export const uid = (prefix) =>
  prefix + "_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const byDate = (a, b) => a.createdAt - b.createdAt;
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const trunc = (s, n) => { s = String(s ?? ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

/** Stable number in [0, 1) from a string, used to desynchronise motion. */
export function hashSeed(str) {
  let x = 0;
  for (const c of String(str)) x = (x * 31 + c.charCodeAt(0)) | 0;
  return (Math.abs(x) % 1000) / 1000;
}

/** Relative luminance of a #rrggbb colour, 0 (black) to 1 (white). */
export function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

/** Create an HTML element: h("div", { class: "x", onclick: fn }, child, "text", [more]). */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") {
      for (const [sk, sv] of Object.entries(v)) sk.startsWith("--") ? el.style.setProperty(sk, sv) : (el.style[sk] = sv);
    } else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "text") el.textContent = v;
    else if (k in el && k !== "list" && k !== "form") { try { el[k] = v; } catch { el.setAttribute(k, v); } }
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : String(kid));
  }
  return el;
}

/** Create an SVG element. */
export function svg(tag, attrs, ...kids) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
  for (const kid of kids.flat()) if (kid) el.append(kid);
  return el;
}

/** Pointer drag session. move(dx, dy, ev) while moving; end(ev, moved) on release. */
export function drag(e, { move, end, threshold = 4 }) {
  const sx = e.clientX, sy = e.clientY;
  let moved = false;
  const onMove = (ev) => {
    const dx = ev.clientX - sx, dy = ev.clientY - sy;
    if (!moved && Math.hypot(dx, dy) < threshold) return;
    moved = true;
    move && move(dx, dy, ev);
  };
  const onUp = (ev) => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    end && end(ev, moved);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
}

export function placeCaretEnd(el) {
  const r = document.createRange();
  r.selectNodeContents(el);
  const s = getSelection();
  s.removeAllRanges();
  s.addRange(r);
}

let pointerIsDown = false;
addEventListener("pointerdown", () => { pointerIsDown = true; }, true);
addEventListener("pointerup", () => { pointerIsDown = false; }, true);
addEventListener("pointercancel", () => { pointerIsDown = false; }, true);
/** Run fn once any click in progress has finished, so finishing an edit on blur
 *  doesn't redraw the screen under the button that was just pressed. */
export function afterPointer(fn) {
  if (!pointerIsDown) { fn(); return; }
  addEventListener("pointerup", () => setTimeout(fn, 0), { once: true });
}

export const isTyping = () => {
  const a = document.activeElement;
  return !!a && (a.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(a.tagName));
};
