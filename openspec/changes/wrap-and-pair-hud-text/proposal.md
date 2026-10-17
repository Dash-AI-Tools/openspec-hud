# Proposal

## Why

Since the compact layout every HUD row is `truncate-end`, so a long task name, agent description or change name is cut off with no way to read the rest. Meanwhile the panel is often wider than the 42 columns it opens at (inline above the prompt, or a resized dock), and short rows such as the change name and flow step leave most of that width empty while stacking vertically.

## What Changes

- Long free text wraps instead of truncating: the current task, next task, agent description and MCP call. Each item is limited to 2 rows; text beyond that ends with an ellipsis.
- Short rows share a row when they fit together in the available width:
  - change name and `step · skill`
  - `tokens / window · cost` and the rate limits
  - on narrow panes they stack exactly as today
- The row cap changes from a flat 10 to: 10 rows when nothing wraps, and 14 rows at most in the worst case where every wrappable item uses 2 rows.
- Fixed-length rows (bars, counts, percentages) never wrap; they keep their sizing from bodyColumns.

Assumptions:
- "Side by side" means packing whole rows next to each other when they fit, not a general multi-column grid.
- The 2-row limit and 14-row ceiling were chosen with the user (wrapped items capped at 2 rows).

## Capabilities

### New Capabilities

### Modified Capabilities
- `hud-layout`: the height cap allows wrapped items up to 2 rows each, running-work entries may wrap, and short rows pair up in wide panes; wrapping and pairing become explicit requirements.

## Impact

- `hooks/register.tsx`: `ui.render` row building (wrapping, pairing).
- `hooks/openspec.ts`: small pure helpers for clamping text to N wrapped rows and for deciding whether two rows fit side by side, so they are unit-testable.
- `tests/hud.test.tsx`: new tests for wrapping, ellipsis, pairing at narrow and wide widths; the height test gains worst-case assertions.
- `README.md`: layout description (wrapping, side-by-side, row ceiling).
- Depends on the archived `compact-hud-height` change (now the main `hud-layout` spec).
