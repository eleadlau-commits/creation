// Palettes. Contract: { id, label, scheme: "light"|"dark", tokens: { "--css-var": value } }
// A palette with tokens: null follows the viewer's system light/dark setting (css/theme.css).
// To add a palette, add an object to this list. Every token from css/theme.css should be given.

const light = (o) => ({
  "--ground": "#eceff2", "--surface": "#ffffff", "--ink": "#1b2130", "--ink-2": "#5a6374", "--line": "#d3d8e0", "--dot": "#c4cad4",
  "--accent": "#1f7a68", "--accent-ink": "#ffffff", "--accent-soft": "#d7ece6", "--danger": "#b4392f",
  "--room-s": "42%", "--room-l": "87%", "--room-stroke-l": "62%", "--pill-l": "93%", "--pill-line-l": "72%", "--field-a": ".30", ...o,
});
const dark = (o) => ({
  "--ground": "#13161b", "--surface": "#1d2128", "--ink": "#e6e9ef", "--ink-2": "#98a1b0", "--line": "#2f353f", "--dot": "#2c323b",
  "--accent": "#52c3a7", "--accent-ink": "#0d1f1a", "--accent-soft": "#1c3631", "--danger": "#ef7d71",
  "--room-s": "26%", "--room-l": "25%", "--room-stroke-l": "42%", "--pill-l": "22%", "--pill-line-l": "40%", "--field-a": ".26", ...o,
});

export default [
  { id: "auto", label: "Follow system", scheme: null, tokens: null },
  { id: "paper", label: "Paper", scheme: "light", tokens: light({}) },
  { id: "night", label: "Night", scheme: "dark", tokens: dark({}) },
  { id: "moss", label: "Moss", scheme: "light", tokens: light({
    "--ground": "#e7ebe1", "--surface": "#f8faf5", "--line": "#cdd5c4", "--dot": "#bcc6b1",
    "--accent": "#4d6b2f", "--accent-soft": "#dfe8d2", "--room-s": "34%", "--room-l": "84%" }) },
  { id: "ink", label: "Ink", scheme: "dark", tokens: dark({
    "--ground": "#0f1424", "--surface": "#182035", "--line": "#27304a", "--dot": "#232c45",
    "--accent": "#8fa8ff", "--accent-ink": "#0f1424", "--accent-soft": "#25305a", "--room-s": "34%", "--room-l": "24%" }) },
  { id: "dusk", label: "Dusk", scheme: "light", tokens: light({
    "--ground": "#f1e9e6", "--surface": "#fffaf8", "--line": "#e0d2cd", "--dot": "#d3c2bc",
    "--accent": "#8c3d5a", "--accent-soft": "#f0dbe2", "--room-s": "38%", "--room-l": "87%" }) },
];
