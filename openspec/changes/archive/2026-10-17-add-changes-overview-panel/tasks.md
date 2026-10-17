# Tasks

## 1. One scan, full list

- [x] 1.1 Add a `changesA` atom and make `scanChange` store all scanned changes ordered by score (preferred first, then newest mtime), setting `changeA` to the first. Verify the existing HUD tests pass unchanged and a new test with two changes shows the HUD following the preferred one.

## 2. Panel and command

- [x] 2.1 Register the `openspec-changes` command and a `changesShownA` atom; toggle the `openspec-changes` pane (`Changes`, 42 columns) open/closed from `command.run`, report shown/hidden text, and mark a person-initiated close as closed. Verify a test that runs the command twice sees the open then close and the texts, and that the HUD pane is unaffected.
- [x] 2.2 Add the `ui.render` handler for `requestId: 'openspec-changes'` listing each change with the marker on the first entry, `done/total · N left` and bar, `no tasks yet`, `done`, and `no active changes`. Verify render tests for each state, the marker/order with two changes, and that `archive` is not listed.
- [x] 2.3 Make the panel refresh with the scan (a checked task changes the entry's counts). Verify a test that re-runs the scan after changing the `fs.read` result sees the new counts.

## 3. Docs

- [x] 3.1 Document `/openspec-changes` and the panel in the README (what it lists, order, marker, states, reopen behavior). Verify the README matches the rendered states the tests assert.
