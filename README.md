# openspec-hud

A Claude Code mod that shows an [OpenSpec](https://github.com/Fission-AI/OpenSpec) HUD in a side panel next to the transcript:

```
 ┌─ transcript ───────────────────────┐ ┌─ OpenSpec ──────────────────────┐
 │                                    │ │ ◆ OpenSpec HUD                  │
 │  ● Reading tasks.md…               │ │                                 │
 │                                    │ │ CHANGE                          │
 │                                    │ │ add-dark-mode                   │
 │                                    │ │                                 │
 │                                    │ │ FLOW                            │
 │                                    │ │ ● apply                         │
 │                                    │ │ skill openspec-apply-change     │
 │                                    │ │                                 │
 │                                    │ │ TASKS                           │
 │                                    │ │ ██████████░░░░░░░░░░░░░░        │
 │                                    │ │ 2/5 done  ·  3 left             │
 │                                    │ │ ▶ now                           │
 │                                    │ │ 2.1 Implement parser            │
 │                                    │ │ ○ next                          │
 │                                    │ │ 2.2 Wire the HUD                │
 │                                    │ │                                 │
 │                                    │ │ ⚙ AGENTS                        │
 │                                    │ │ Explore · running               │
 │                                    │ │ Find theme code                 │
 │                                    │ │                                 │
 │                                    │ │ ⇄ MCP                           │
 │                                    │ │ github › get_me                 │
 │                                    │ │                                 │
 │                                    │ │ CONTEXT                         │
 │                                    │ │ ██████████░░░░░░░░░░░░░░ 42%    │
 │                                    │ │ 84k / 200k tokens               │
 │                                    │ │ 5h    ████░░░░░░░░░░░░░ 23%     │
 │ > _                                │ │ cost $1.50                      │
 └────────────────────────────────────┘ └─────────────────────────────────┘
```

The HUD is a side panel docked to the right of the transcript, laid out top to bottom. Sections with nothing to show (no tasks, no running agent or MCP call) are left out.

**Docking needs the fullscreen terminal UI** at 110+ columns: set `"tui": "fullscreen"` in `~/.claude/settings.json` (or pick it in `/config`). In the classic UI, or a narrower terminal, the panel opens inline above the prompt instead. Drag the panel edge to resize it; it opens 42 columns wide.

- **Skill / step**: the last OpenSpec skill (`openspec-*`) or command (`/opsx:*`, `/openspec-*`) used, mapped to the flow step. Without one, the step is inferred from the change's files (no `tasks.md` → propose, open tasks → apply, all done → verify).
- **Change**: the change named in the last `/opsx:<cmd> <change>`, else the most recently edited change under `openspec/changes/` (excluding `archive`).
- **Tasks**: current and next unchecked `- [ ]` items in `tasks.md`, done/total and remaining. Refreshes after edits under `openspec/`, at each turn end and every 10s.
- **Agents**: subagents currently running, with type, status and task description.
- **MCP**: the MCP server and tool currently being called (e.g. `github · get_me`), shown only while a call is running.
- **Context / usage**: context-window bar, tokens used/window, rate-limit windows (5h, 7d) on subscriptions, and session cost.

Each kind of info has its own theme color: change name, current flow step (yellow), skill, task counts (done green, remaining yellow), current/next task, agent type and status, MCP server and tool, and context/rate-limit levels (green under 60%, yellow under 85%, red above). Colors follow the active Claude Code theme.

`/openspec-hud` opens or closes the panel. Closing it with its close mark keeps it closed in later sessions until `/openspec-hud` opens it again.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install openspec-hud --marketplace davidcp90/mods
```

Answer `y` to add the marketplace, then pick a scope (**User** for every session, **Project** for this repository only). The panel opens right away.

From a local clone instead:

```
git clone https://github.com/davidcp90/mods.git
claude --plugin-dir ./mods/openspec-hud
```

To update an installed copy: `claude plugin update openspec-hud`, then `/reload-plugins`. See the [root README](../README.md#updating) for other install methods, uninstalling and `CLAUDE_CODE_PLUGIN_DIRS`.

## Develop

```
claude plugin validate openspec-hud
claude plugin test openspec-hud
claude --plugin-dir ./openspec-hud
```
