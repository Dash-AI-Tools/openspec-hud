# Proposal

## Why

The HUD body is about 25 rows tall when every section is populated: each section has its own heading row and a blank margin row, and the flow, task, context and rate-limit info each take several rows. In the docked panel that eats most of the transcript's height, and inline above the prompt it pushes the prompt off a short terminal. A HUD should glance, not dominate.

## What Changes

- Render the HUD body in at most 10 rows in every state (typically 8 with change, flow, tasks and context), instead of ~25.
- Drop per-section heading rows and the blank margin rows between sections; the colored values already identify themselves.
- Merge related info onto shared rows:
  - flow step and skill on one row
  - task bar and `done/total · left` on one row
  - tokens used/window and cost on one row
  - all rate-limit windows on one row
- Show at most one row for agents and one row for MCP calls; extra running items collapse into a `+N` count.
- Remove the in-body `◆ OpenSpec HUD` title row; the pane chrome already shows the title.
- Keep per-kind theme colors and all existing information; nothing is dropped, only repacked, so the 10-row cap holds by construction.

Assumption: "8-10 lines" means the rows rendered inside the pane body, not the pane's own border and title chrome, and applies to both the docked and inline placements (they share one renderer).

## Capabilities

### New Capabilities
- `hud-layout`: how tall the HUD body may be, and how sections are packed into rows.

### Modified Capabilities

## Impact

- `hooks/register.tsx`: the `ui.render` handler (block/heading/margin structure, row packing, budget).
- `tests/hud.test.tsx`: the render test asserts on the `CHANGE` heading and per-row texts; update it and add a height test.
- `README.md`: the HUD description and screenshots (`images/*.png`) no longer match the layout.
