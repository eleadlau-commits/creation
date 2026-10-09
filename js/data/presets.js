// Starting room types and flavours for a new workspace.
// They are ordinary data: users can edit or delete them in Settings.
// Each one is just a name plus a set of setting overrides (see settings/definitions.js).

export function defaultRoomTypes(now = Date.now()) {
  return [
    { id: "rtype_plain", name: "Plain", settings: {}, createdAt: now },
    { id: "rtype_project", name: "Project", settings: { roundness: 34, outline: "dashed", outlineWidth: 1.8 }, createdAt: now + 1 },
    { id: "rtype_floating", name: "Floating", settings: { roundness: 100, motion: "bob", motionStrength: 55, outline: "none" }, createdAt: now + 2 },
  ];
}

export function defaultFlavours(now = Date.now()) {
  return [
    { id: "flav_hunch", name: "Hunch", settings: { mark: "~", tint: 42, itemOutline: "dashed" }, createdAt: now },
    { id: "flav_question", name: "Question", settings: { mark: "?", tint: 208 }, createdAt: now + 1 },
    { id: "flav_quote", name: "Quote", settings: { mark: "“", itemRoundness: 30, itemOutline: "none", tint: 300 }, createdAt: now + 2 },
  ];
}
