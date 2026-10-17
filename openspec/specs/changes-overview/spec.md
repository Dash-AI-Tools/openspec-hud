# changes-overview Specification

## Purpose
Lets the user see the task progress of every active OpenSpec change at once, in a panel separate from the HUD that follows a single change.

## Requirements

### Requirement: Changes command toggles a panel
The plugin SHALL provide the `/openspec-changes` command that opens a "Changes" panel when it is closed and closes it when it is open, independently of the main HUD panel.

#### Scenario: Open
- **WHEN** the user runs `/openspec-changes` and the panel is closed
- **THEN** the "Changes" panel opens and the command reports it shown

#### Scenario: Close
- **WHEN** the user runs `/openspec-changes` and the panel is open
- **THEN** the panel closes and the command reports it hidden

#### Scenario: Independent of the HUD
- **WHEN** the main HUD panel is hidden and the user runs `/openspec-changes`
- **THEN** only the "Changes" panel opens

#### Scenario: Closed by the user
- **WHEN** the user closes the panel with its close mark
- **THEN** it stays closed in later sessions until `/openspec-changes` opens it again

### Requirement: Lists every active change
The panel SHALL list each folder under `openspec/changes/` except `archive`, one entry per change, showing the change name, a progress bar, `done/total` and the number of tasks left.

#### Scenario: Several changes
- **WHEN** `openspec/changes/` holds `add-auth` with 2 of 5 tasks checked and `fix-bar` with 0 of 3
- **THEN** both are listed, `add-auth` showing `2/5` and `3 left`, `fix-bar` showing `0/3` and `3 left`

#### Scenario: Archived changes hidden
- **WHEN** a change lives under `openspec/changes/archive/`
- **THEN** it is not listed

#### Scenario: No active changes
- **WHEN** `openspec/changes/` holds no active change
- **THEN** the panel shows `no active changes`

### Requirement: Entry states
An entry SHALL show `no tasks yet` when its change has no `tasks.md` or no checkbox tasks, and `done` in the success color when all of its tasks are checked.

#### Scenario: Proposal only
- **WHEN** a change has a proposal but no `tasks.md`
- **THEN** its entry reads `no tasks yet` and shows no bar

#### Scenario: All tasks checked
- **WHEN** every task in a change is checked
- **THEN** its entry shows a full bar and `done`

### Requirement: Followed change marked and first
The panel SHALL mark the change the main HUD currently follows and list it first; the remaining changes SHALL be ordered by most recently edited first.

#### Scenario: Followed change
- **WHEN** the main HUD follows `fix-bar` and `add-auth` was edited more recently
- **THEN** `fix-bar` is listed first with the marker, followed by `add-auth`

### Requirement: Panel stays current
The panel SHALL refresh with the HUD's change scan, so progress and the list reflect edits to `tasks.md`, new changes and archived changes without reopening the panel.

#### Scenario: Task checked
- **WHEN** a task in `add-auth` is checked and the scan runs
- **THEN** the `add-auth` entry shows the new `done/total` and `left` counts
