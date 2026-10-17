# Proposal

## Why

The HUD only follows one change at a time (the one named in the last `/opsx:*` command, else the most recently edited). When several changes are in flight there is no way to see their progress or how many tasks each still has without opening the files, and the chosen change can silently be the wrong one.

## What Changes

- Add a `/openspec-changes` command that opens or closes a second panel, "Changes", next to the existing HUD panel.
- The panel lists every active change (each folder under `openspec/changes/` except `archive`), one entry per change, with:
  - the change name, marked when it is the one the main HUD follows
  - a progress bar with `done/total · N left`
  - `no tasks yet` when the change has no `tasks.md` or no checkboxes, and `done` when all tasks are checked
- Entries refresh together with the main HUD scan (edits under `openspec/`, turn end, every 10s).
- The main HUD, `/openspec-hud`, and the 10/14-row layout rules are unchanged.

Assumptions:
- "Second panel" and "active, unarchived" were chosen with the user; changes with every task checked stay listed, marked `done`.
- Entry order: the followed change first, then by most recent edit.
- No row cap: the panel body scrolls in the host when the list is long.
- The panel is opt-in per session; closing it with its close mark keeps it closed until the command opens it again, matching the main HUD.

## Capabilities

### New Capabilities
- `changes-overview`: a command-opened panel that lists all active changes with task progress and tasks left.

### Modified Capabilities

## Impact

- `hooks/register.tsx`: scan all changes (the existing `scanChange` already walks them and keeps one), a new atom for the list, command registration, open/close handling, and a second `ui.render` handler.
- `hooks/openspec.ts`: possibly a small helper to order the list.
- `tests/hud.test.tsx`: tests for the command toggle, listing, marker, states and refresh.
- `README.md`: document the command and panel.
- Independent of the in-progress `wrap-and-pair-hud-text` change; it does not touch `hud-layout`.
