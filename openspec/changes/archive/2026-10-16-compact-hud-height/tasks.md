# Tasks

## 1. Compact core rows

- [x] 1.1 In `hooks/register.tsx` `ui.render`, remove the title `Box`, `heading()`, `block()` and all `marginBottom`; render rows as a plain column. Verify with the render test that no `CHANGE`, `FLOW`, `TASKS`, `CONTEXT` or `OpenSpec HUD` text exists.
- [x] 1.2 Merge flow step and skill onto one row, and `▶ now` / `○ next` labels onto their task text (one row each). Verify the render test finds `● apply`, `openspec-apply-change`, `▶ 2.1 Implement parser` and `○ 2.2 Wire the HUD`.
- [x] 1.3 Put the task bar and `done/total · N left` on one row, sizing the bar from the width minus the counts. Verify `3 left` and a bar row appear together and a 40-column mount does not truncate the counts.

## 2. Compact agents, MCP and usage

- [x] 2.1 Render running agents as a single `⚙ type · status · description` row with a `+N` suffix for the rest, and MCP calls as a single `⇄ server › tool` row with `+N`. Verify with a two-agent test that one agent row shows `+1`, and that the existing MCP test still passes.
- [x] 2.2 Merge tokens and cost onto one row and all rate-limit windows onto one row as `label pct%` colored by `levelColor`. Verify `84k / 200k`, `$1.50`, `5h` and the `42%` success color in the render test.

## 3. Height proof and docs

- [x] 3.1 Add a test that mounts the HUD fully populated (tasks with current and next, two agents, an MCP call, usage with two rate limits and cost) and asserts the body has 10 rows or fewer, and a typical case with 8 rows. Verify the test passes in both `terminal` and `desktop` surfaces.
- [x] 3.2 Update the existing render test's heading and per-row assertions to the new layout (remove `/^CHANGE$/` color check, use the merged row texts). Verify the whole suite passes with the project's test command.
- [x] 3.3 Update the README HUD description (remove heading references, state the 10-row cap and the collapsed agent and MCP rows). Verify the README matches the rendered rows listed in the design.
