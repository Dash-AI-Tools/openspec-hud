# Spec Delta

## MODIFIED Requirements

### Requirement: HUD body height cap
The HUD body SHALL render in at most 10 rows when no text wraps, and in at most 14 rows in every state, including when a change, flow, tasks, running agents, running MCP calls, context and rate limits are all present, with no blank spacer rows.

#### Scenario: Everything populated
- **WHEN** a change with open tasks, a running agent, a running MCP call, context usage, two rate-limit windows and a cost are all present and every text fits on one row
- **THEN** the HUD body renders 10 rows or fewer

#### Scenario: Typical session
- **WHEN** a change with tasks, context usage, rate limits and a cost are present and no agent or MCP call is running, in a pane too narrow to pair any rows
- **THEN** the HUD body renders 8 rows

#### Scenario: Worst case
- **WHEN** every wrappable item is long enough to need more than 2 rows in a narrow pane
- **THEN** the HUD body renders 14 rows or fewer

### Requirement: Running work collapses to one row each
The HUD SHALL show running subagents as a single entry and running MCP calls as a single entry; when more than one is running, the entry SHALL show the first with a `+N` count of the rest. Each entry MAY wrap onto a second row.

#### Scenario: Two agents running
- **WHEN** two subagents are running
- **THEN** one entry shows the first agent's type, status and description, plus `+1`

#### Scenario: No agents or MCP calls
- **WHEN** no subagent or MCP call is running
- **THEN** no agent or MCP entry renders

## ADDED Requirements

### Requirement: Long text wraps
The HUD SHALL wrap the current task, next task, agent description and MCP call text onto additional rows instead of truncating them, up to 2 rows per item, and SHALL end the second row with an ellipsis when the text is longer.

#### Scenario: Task fits on two rows
- **WHEN** the current task is longer than one row but fits in two
- **THEN** the full task text renders across two rows with no ellipsis

#### Scenario: Task longer than two rows
- **WHEN** the current task needs more than two rows
- **THEN** it renders on two rows and the second ends with an ellipsis

#### Scenario: Fixed rows never wrap
- **WHEN** the pane is narrower than the task bar and counts would need
- **THEN** the bar and percentage rows stay on one row

### Requirement: Short rows pair side by side
The HUD SHALL place the change name and the flow row on one row, and the tokens and cost row and the rate-limits row on one row, when both fit together within the body width; otherwise they SHALL stack on separate rows in the same order.

#### Scenario: Wide pane
- **WHEN** the body width is large enough for the change name and `step · skill` together
- **THEN** they render on one row

#### Scenario: Narrow pane
- **WHEN** the body width cannot hold both
- **THEN** they render on two rows, change name first

#### Scenario: Pairing keeps order
- **WHEN** rows pair
- **THEN** the first row's content appears left of the second's, separated by at least two spaces
