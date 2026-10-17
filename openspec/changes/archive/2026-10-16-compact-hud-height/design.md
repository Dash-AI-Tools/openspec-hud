# Design

## Context

The whole HUD is the `ui.render` handler in `hooks/register.tsx`. It builds `blocks`, each a column `Box` with `marginBottom={1}`, a bold heading `Text`, and one `Text` per line; a title `Box` with its own margin sits above them. Every line is `wrap="truncate-end"`, so a long value never wraps, but the heading, margin and split rows add up to about 25 rows at full population. The same render serves docked (42 columns) and inline placements, so one change fixes both. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Body height is at most 10 rows by construction, not by clipping.
- Same information, same per-kind colors.

**Non-Goals:**
- Collapsing, scrolling or toggling sections at runtime.
- Changing what is tracked (state atoms, scanning, hooks) or the pane's width.
- Re-shooting README screenshots as part of the code change (tracked as a doc task).

## Decisions

**Row budget (max 10), one `Text` row each:**

| # | Row | Present when |
|---|-----|--------------|
| 1 | change name | always (`no active change` when none) |
| 2 | `● step · skill` | always (`—` for missing parts) |
| 3 | task bar + `done/total · N left` | change has tasks |
| 4 | `▶ <current task>` | a current task exists |
| 5 | `○ <next task>` | a next task exists |
| 6 | `⚙ type · status · description (+N)` | a subagent runs |
| 7 | `⇄ server › tool (+N)` | an MCP call runs |
| 8 | context bar + `%` | usage known |
| 9 | `tokens / window · $cost` | usage known |
| 10 | rate limits, e.g. `5h 23% · 7d 8%` | rate limits reported |

Maximum is 10; the typical case without agents or MCP is 8.

**Drop headings and the title row rather than shrinking them.** The pane chrome already carries the title `OpenSpec`, and colors plus glyphs (`●`, `▶`, `○`, `⚙`, `⇄`) already label each row. Alternative considered: keep headings, drop only margins. That reaches ~15 rows, not 10.

**Cap running work at one row each with a `+N` suffix.** The agent and MCP lists are unbounded, so they are the only way to break the cap. Alternative: show up to N rows and clip; rejected because it makes the cap depend on a second constant. One summary row keeps height constant, and the lost detail (extra agents) is low value at a glance.

**Rate limits share a row; bars drop to a percentage.** Two bars plus labels do not fit in ~40 columns. Each window renders as `label pct%` colored by `levelColor`; the context row keeps the bar. Alternative: a short bar per window; rejected, since width is already tight at 42 columns.

**Pure render, no layout helper.** Rows are built inline with the existing `line()` helper; `block()` and `heading()` are deleted. A separate row-budget abstraction would have one caller.

**Inputs that cannot raise the count:** long text is already `truncate-end`, so a long task or agent description stays on one row.

## Risks / Trade-offs

- [The task bar shares a row with `done/total · N left`, so it gets narrower] → size the bar from `width` minus the counts' length, with the existing 8-column floor.
- [Narrow panes truncate the merged rows (`step · skill`, agent row)] → put the most important part first (step, agent type and status) so truncation cuts the tail.
- [Colors become the only row label, which is weaker for color-blind users] → keep glyph prefixes (`▶ ○ ⚙ ⇄ ●`) so rows stay distinguishable without color.
- [README screenshots go stale] → doc task to update the description; re-shooting images is left to the author.
