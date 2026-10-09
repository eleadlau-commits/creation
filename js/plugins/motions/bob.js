// A gentle up-and-down float.
export default {
  id: "bob",
  label: "Gentle bob",
  keyframes: `@keyframes motion-bob {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(calc(var(--m-amp) * -1)); }
  }`,
  apply(el, strength, seed) {
    el.style.setProperty("--m-amp", (strength / 100 * 9).toFixed(1) + "px");
    el.style.animation = `motion-bob ${(3.2 + seed * 2).toFixed(2)}s ease-in-out ${(-seed * 5).toFixed(2)}s infinite`;
  },
};
