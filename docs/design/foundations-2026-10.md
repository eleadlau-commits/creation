# Design note: nested rooms, rich items with history, optional login (Firebase)

Decided with the owner on 2026-10-09. Build in this order: Phase 1 → 2 → 3.
Each phase that changes the saved data shape adds ONE migration step (bump CURRENT in
js/data/migrations.js). Existing browser-saved workspaces must keep working at every step.

## Phase 1 — Rooms inside rooms

Theme: items never exist by themselves; every item lives in exactly one room.
Rooms can be grouped into a bigger room, and once inside another room, a room
BECOMES AN ITEM there.

Rules:
- Containment is strict: a room is wholly inside exactly one parent (or at top level).
  It is never partly in several. Nesting depth is unlimited. No cycles.
- Inside its parent, a room is a normal item with a new format "room"
  (content: { roomId }). As an item it takes part in every mode exactly like any other
  item: shelf, placement, graph links, and fuzzy membership are all allowed.
  (Only the containment itself is strict.)
- Source of truth: the room-item. Also store room.parentId for fast lookup, but only
  change it through Act.* functions that keep both in sync. Add a consistency check.
- Top level: the existing rooms screen shows rooms with parentId = null, as now.

Interface:
- Rooms screen: a way to select several rooms (e.g. a Select button, or shift-click),
  then "Group into new room". This creates a new top-level room near them and moves the
  selected rooms inside, where they appear on its shelf as room-items.
- Inside a room: "New room here" creates a child room directly inside it.
- A room-item pill looks like a small squircle chip in that room's colour, with its name
  and a count. Single click selects (consistent with other pills); double-click,
  Enter or "Open" in the selection bar opens it.
- Selection bar for a room-item: Open, Rename, "Move out" (to the parent's parent, or the
  top level), Delete. No flavour picker: room-items use their room's own look.
- Room header: breadcrumbs (Creation › Parent › This room). The back button goes up one level.
- Look is NOT inherited from the parent room (the settings chain is unchanged).
- Deleting a room: its ordinary items are deleted; any rooms inside it move up to the deleted
  room's parent (onto that room's shelf, or to the top level). Undoable, with a toast.
- A room-item that is moved back to the top level gets a sensible default position and size.

## Phase 2 — Rich items, with history

New item fields (text items and image items alike):
- title: keep using `content` for text items so nothing else breaks. Image items get an
  editable title that defaults to the file name.
- note: longer plain text with line breaks.
- sources: list of { id, label, url (optional), locator (optional, e.g. "p. 48") }.
- origin: { at: date the idea first came (optional, may differ from createdAt),
  context: short text, e.g. "on a walk" }.

Interface:
- An item details panel (side panel) opened by double-click or "Details" in the selection
  bar: edit the title, note, sources and origin, and see the history.
- Pills stay clean: a small indicator shows when an item has a note or sources.
- Inline title editing (Enter on a selected pill) stays.
- Deliberately NO tags: flavours cover the kind of idea, and tags would reintroduce set-based
  categorising, which Creation avoids.

History:
- Record a version (title, note, sources, origin; never image files) when an edit is finished,
  not on every keystroke. Merge edits made within 5 minutes into one version. Keep at most
  50 versions per item.
- Store history SEPARATELY from the workspace, in IndexedDB, and load it only when the
  details panel is opened. It must never slow down opening a room.
- The details panel lists versions with dates and can restore one (restoring creates a new version).
- Backups (Download / Import) include history.
- Also move the workspace itself from localStorage to IndexedDB in this phase, to remove the
  ~5 MB limit. Migrate existing localStorage data automatically and keep it until the move succeeds.

## Phase 3 — Optional login with Firebase

Login is OPTIONAL:
- Not signed in: exactly today's behaviour (saved in this browser).
- Signed in: saved to the owner's account and synced across devices. A local copy is kept for
  speed and offline use.

Firebase setup:
- Firebase Auth (Google sign-in and email link), Firestore and Cloud Storage, loaded as ES
  modules from the official CDN with a pinned version. No build step.
- Config goes in js/storage/firebase-config.js. These web config values are public by design;
  security comes from the rules below.
- Firestore records are capped at 1 MB, so store each record separately. Never store the whole workspace as one record:
    users/{uid}/meta/workspace      (version, settings, roomTypes, flavours, roomsPan)
    users/{uid}/rooms/{roomId}
    users/{uid}/items/{itemId}
    users/{uid}/layouts/{roomId}__{modeId}
    users/{uid}/history/{itemId}
  Images go in Cloud Storage at users/{uid}/blobs/{blobId}.
- Add an updatedAt to rooms, items and layouts (migration step). Sync per record,
  where the latest updatedAt wins. Write only changed records, debounced and batched.
- Security rules files in the repo (firestore.rules, storage.rules): a user can read and write only
  under their own users/{uid}. Nothing else is readable.
- A new storage adapter behind the existing storage facade. Boot must handle async loading:
  show local data immediately, then reconcile with the account.

Sign-in and sign-out behaviour (agreed):
- First sign-in, account empty: upload this browser's workspace silently.
- Sign-in, account already has a workspace that differs from this browser's: ask ONCE, "Keep the
  account's version" or "Replace it with this browser's". The version not kept is automatically
  downloaded as a backup file, so nothing is lost. No automatic merging.
- Sign-out: offer "Keep a copy on this device" or "Remove from this device" (for shared computers).

Interface:
- A new "Account" tab in the Settings drawer: sign in or out, who is signed in, and sync status.
- The save indicator says "Synced to your account" or "Saved in this browser" as appropriate.

Owner setup guide:
- Write docs/firebase-setup.md, step by step for a non-developer:
  - create the project
  - enable Google and email-link sign-in
  - add the GitHub Pages domain (and any custom domain) to the authorised domains
  - create Firestore and Storage
  - paste the config
  - paste the rules in the console
- Note that Cloud Storage may require the pay-as-you-go (Blaze) plan with a card, but personal
  use stays within the free allowance. Check the current Firebase terms.
