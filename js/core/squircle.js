import { clamp } from "./dom.js";

/**
 * SVG path for a squircle: straight sides joined by superellipse corners.
 * roundness 0 = sharp rectangle, 100 = as round as the shape allows.
 */
export function squirclePath(w, hgt, roundness = 84) {
  const r = Math.min(w, hgt) * 0.5 * clamp(roundness, 0, 100) / 100;
  if (r < 0.5) return `M0 0H${w}V${hgt}H0Z`;
  const n = 4.2, N = 14, pts = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= N; i++) {
      const a = (a0 + 90 * i / N) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      pts.push([cx + r * Math.sign(c) * Math.abs(c) ** (2 / n), cy + r * Math.sign(s) * Math.abs(s) ** (2 / n)]);
    }
  };
  corner(r, r, 180);
  corner(w - r, r, 270);
  corner(w - r, hgt - r, 0);
  corner(r, hgt - r, 90);
  return "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join("L") + "Z";
}
