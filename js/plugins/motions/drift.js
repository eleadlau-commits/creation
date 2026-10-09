// A slow wandering sway with a slight tilt.
export default {
  id: "drift",
  label: "Drift",
  keyframes: `@keyframes motion-drift {
    0%   { transform: translate(0, 0) rotate(0deg); }
    25%  { transform: translate(var(--m-amp), calc(var(--m-amp) * -.6)) rotate(var(--m-rot)); }
    50%  { transform: translate(calc(var(--m-amp) * .4), calc(var(--m-amp) * .5)) rotate(0deg); }
    75%  { transform: translate(calc(var(--m-amp) * -.7), calc(var(--m-amp) * -.3)) rotate(calc(var(--m-rot) * -1)); }
    100% { transform: translate(0, 0) rotate(0deg); }
  }`,
  apply(el, strength, seed) {
    el.style.setProperty("--m-amp", (strength / 100 * 7).toFixed(1) + "px");
    el.style.setProperty("--m-rot", (strength / 100 * 1.6).toFixed(2) + "deg");
    el.style.animation = `motion-drift ${(9 + seed * 6).toFixed(2)}s ease-in-out ${(-seed * 9).toFixed(2)}s infinite`;
  },
};
