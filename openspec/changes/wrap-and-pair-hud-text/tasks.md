# Tasks

## 1. Text helpers

- [x] 1.1 Add `wrapRows(text, width, maxRows)` to `hooks/openspec.ts` (word wrap, hard-break long words, final `…` when text exceeds `maxRows`). Verify unit tests cover fits-in-one, fits-in-two, longer-than-two with ellipsis, and a word longer than width.
- [x] 1.2 Add `fitsSideBySide(lenA, lenB, width)` (2-column gap) to `hooks/openspec.ts`. Verify unit tests at exact-fit, one-over and zero-length boundaries.

## 2. Wrap long text in the render

- [ ] 2.1 In `hooks/register.tsx` `ui.render`, render the current task, next task, and agent description with `wrapRows(..., 2)` as one row per returned string, continuation rows indented under the glyph. Verify a render test with a long task shows two rows and the ellipsis case ends with `…`.
- [ ] 2.2 Wrap the MCP entry the same way (`server › tool` text, 2 rows max). Verify a render test with a long tool name shows at most 2 MCP rows, and the existing MCP appear/disappear test still passes.

## 3. Pair short rows

- [ ] 3.1 Pair change + flow and tokens/cost + rate limits into one `Text` when `fitsSideBySide` allows, otherwise stack in the same order. Verify render tests at `bodyColumns` 35 (stacked, 8 rows) and 100 (paired, 6 rows) with the same state.
- [ ] 3.2 Update the existing render and height tests for pairing and wrapping (row counts, find texts). Verify the whole suite passes with `claude plugin test .`.

## 4. Ceiling proof and docs

- [ ] 4.1 Add a worst-case test: long task, next task, agent description and MCP tool, two agents, usage with two rate limits and cost, at `bodyColumns` 40. Verify it renders 14 rows or fewer, and exactly the rows listed in design.md.
- [ ] 4.2 Update the README layout description (wrapping up to 2 rows, side-by-side in wide panes, 10 typical / 14 maximum rows). Verify it matches the behavior the tests assert.
