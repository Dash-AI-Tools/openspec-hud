# hud-layout Specification

## Purpose
Defines how tall the OpenSpec HUD body may be and how its information is packed into rows, so the panel stays glanceable in both docked and inline placements.

## Requirements

### Requirement: HUD body height cap
The HUD body SHALL render in at most 10 rows in every state, including when a change, flow, tasks, running agents, running MCP calls, context and rate limits are all present, with no blank spacer rows.

#### Scenario: Everything populated
- **WHEN** a change with open tasks, a running agent, a running MCP call, context usage, two rate-limit windows and a cost are all present
- **THEN** the HUD body renders 10 rows or fewer

#### Scenario: Typical session
- **WHEN** a change with tasks, context usage, rate limits and a cost are present and no agent or MCP call is running
- **THEN** the HUD body renders 8 rows

### Requirement: No heading or title rows
The HUD body SHALL NOT render section heading rows or an in-body title row; each row's content SHALL identify itself by its value and color.

#### Scenario: Headings absent
- **WHEN** the HUD renders with a change and context usage
- **THEN** no row reads `CHANGE`, `FLOW`, `TASKS`, `CONTEXT` or `OpenSpec HUD`

### Requirement: Related info shares a row
The HUD SHALL show flow step and skill on one row, the task progress bar with `done/total` and remaining count on one row, tokens used and window with cost on one row, and all rate-limit windows on one row.

#### Scenario: Flow row
- **WHEN** the step is `apply` and the skill is `openspec-apply-change`
- **THEN** one row contains both `apply` and `openspec-apply-change`

#### Scenario: Multiple rate limits
- **WHEN** both a 5-hour and a 7-day rate-limit window are reported
- **THEN** both appear on the same row

### Requirement: Running work collapses to one row each
The HUD SHALL show running subagents on a single row and running MCP calls on a single row; when more than one is running, the row SHALL show the first with a `+N` count of the rest.

#### Scenario: Two agents running
- **WHEN** two subagents are running
- **THEN** one row shows the first agent's type, status and description, plus `+1`

#### Scenario: No agents or MCP calls
- **WHEN** no subagent or MCP call is running
- **THEN** no agent or MCP row renders

### Requirement: Existing information and colors preserved
The HUD SHALL keep showing the change name, flow step, skill, current and next task, task counts, context percent, tokens, rate limits and cost, and SHALL keep the per-kind theme colors (for example, context and rate-limit levels green under 60%, yellow under 85%, red above).

#### Scenario: Level color
- **WHEN** context usage is 42%
- **THEN** the percent renders in the success color
