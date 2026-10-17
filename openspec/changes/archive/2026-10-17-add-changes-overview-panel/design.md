# Design

## Context

`scanChange` in `hooks/register.tsx` already lists `openspec/changes/*` (minus `archive`), reads each `tasks.md` into a `ChangeProgress`, scores each by `preferred` (the change named in the last `/opsx:*` command) or newest file mtime, and stores only the winner in `changeA`. The `/openspec-hud` command opens/closes the single `openspec-hud` pane via `$.ui.open(PANE_ARGS)` / `$.ui.close`, and a `hiddenA` atom remembers a person-initiated close. Rendering is a `ui.render` handler keyed by `requestId`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- One scan feeds both panels; no second walk of `openspec/changes/`.
- A second pane with its own command and its own remembered-closed state.
- The marker on the followed change can never disagree with the main HUD.

**Non-Goals:**
- Selecting or switching the followed change from the panel.
- Per-change task lists, flow steps, or agent info in the panel.
- A row cap or custom scrolling; the host pane scrolls.

## Decisions

**Keep the full ordered list from the existing scan.** Change `scanChange` to sort all scanned changes by the same score (preferred first, then newest mtime) and store the list in a new `changesA` atom, then set `changeA` to its first element. Alternative: a second scan function for the panel; rejected because it duplicates the directory walk and could pick a different "followed" change than the HUD. With one source, the first entry is by construction the marked one.

**Second pane, own id and command.** `CHANGES_PANE = 'openspec-changes'` opened with `{ id, title: 'Changes', columns: 42 }`. Command `openspec-changes` registered at `session.start` next to `openspec-hud`; its `command.run` handler toggles a `changesShownA` atom and opens/closes the pane. The existing `ui.close` handler pattern is repeated for the new id, setting `changesShownA` false only for person-initiated closes. Alternative: reuse the HUD pane with a mode switch; rejected by the user (it would need the row cap carved out).

**Opt-in, session-open.** The panel is closed at session start; `changesShownA` is read at `session.start` so a panel the person left open reopens, mirroring the HUD's `hiddenA` but inverted (default closed).

**Entry rendering.** One `Text` row per change when its name and counts fit together (reuse `fitsSideBySide`), else name row then bar row, using the same colors: name `C.change` (marked entry `▶ ` prefix in `C.stepNow`, others indented two spaces), counts `C.done` / `C.remaining`, `no tasks yet` in `C.muted`, `done` in `C.done`. Bar width follows `bodyColumns` of the new pane's `ui.render`.

**State per entry**, from the existing `ChangeProgress`: `!hasTasks || total === 0` → `no tasks yet`; `done === total` → `done`; otherwise bar plus `done/total · N left`.

**Empty list.** Show a single muted `no active changes` row.

## Risks / Trade-offs

- [The host may not allow two panes docked at once] → both panes use their own id and `$.ui.open`; if the host stacks or refuses, the failure is limited to the new command, so catch the open error and return a short text result instead of throwing. Verify live before relying on it.
- [Many changes make a long panel] → accepted; the pane scrolls and the list is ordered by relevance.
- [Marker can show a change as followed that the user did not intend] → the panel exposes that mismatch; changing it stays a `/opsx:* <name>` action.
- [`changeA` now derives from the list] → tests for the existing HUD must keep passing unchanged.
