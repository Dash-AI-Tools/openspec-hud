# Design

## Context

`ui.render` in `hooks/register.tsx` builds one `<Text wrap="truncate-end">` per row (`line(key, body)`) inside a padded column `Box`. Width inputs are `e.props.bodyColumns` (42-column dock by default, wider when inline or resized) and `paddingX={1}`. The archived `compact-hud-height` change made every row one line; this change relaxes that for free text and pairs short rows. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Free text (current/next task, agent description, MCP call) is readable up to 2 rows.
- Short rows share a row when they fit; otherwise the layout is identical to today.

**Non-Goals:**
- Wrapping fixed-size rows (bars, counts, percentages).
- A general grid, per-user layout settings, or a width-based mode switch.
- Wrapping the change name (it stays one row and truncates).

## Decisions

**Wrap with a pure helper, not Ink's `wrap="wrap"`.** Ink wrapping has no row limit, and the 14-row ceiling must hold by construction. Add `wrapRows(text, width, maxRows): string[]` to `hooks/openspec.ts`: word-wrap, hard-break words longer than `width`, and when text exceeds `maxRows`, end the last row with `…`. Each returned string becomes its own `line()` so rows stay `truncate-end` and counting rows stays trivial. Alternative: Ink `wrap="wrap"` plus a `maxHeight` box; rejected because Box clipping cuts text without an ellipsis and its behavior differs between the terminal and desktop surfaces.

**Wrapped items keep their glyph on row 1 and indent the continuation.** `▶ ` / `○ ` / `⚙ ` / `⇄ ` take 2 columns, so text width is `width - 2` and continuation rows start with two spaces. The agent entry wraps only its description (type and status stay on row 1), so the description gets the remaining width after `⚙ type · status · `.

**Pair rows with one `Text`, not a row `Box`.** Pairing two short rows as `<Text>{a}{gap}{b}</Text>` keeps one `Text` per output row, which keeps tests and truncation simple. Each candidate row carries its plain-text length (already known when built). `fitsSideBySide(lenA, lenB, width)` is `lenA + 2 + lenB <= width`, with a 2-column gap. Pairs are fixed: change + flow, and tokens/cost + rate limits. Alternative: generic bin-packing of all rows; rejected, since order and meaning of the stacked layout would become unpredictable.

**Width budget.** `width = max(16, bodyColumns) - 2` for padding. Lengths use `string.length`; the glyphs used (`● ▶ ○ ⚙ ⇄ › · …`) render as one column in the supported terminals.

**Row ceiling.** Worst case in a narrow pane: change 1, flow 1, tasks 1, now 2, next 2, agent 2, mcp 2, context 1, tokens 1, limits 1 = 14. Pairing and short text only reduce it.

## Risks / Trade-offs

- [Wide or ambiguous-width glyphs make the length estimate low, so a pair overflows and truncates] → pairs only drop to `truncate-end` on their right part, and the 2-column gap leaves slack.
- [Terminal width changes while a pair is shown] → pairing is recomputed every render from `bodyColumns`, so it re-stacks on resize.
- [HUD grows to up to 14 rows] → accepted by the user; only long text wraps, and each item is capped at 2 rows.
- [Wrapping changes how many rows tests count] → tests count `truncate-end` Texts per row; pairs stay one Text.
