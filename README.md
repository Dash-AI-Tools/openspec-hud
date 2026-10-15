# openspec-hud

A Claude Code mod that shows an [OpenSpec](https://github.com/Fission-AI/OpenSpec) HUD in a side panel next to the transcript:

<p align="center">
  <img src="images/vertical.png" alt="OpenSpec HUD docked as a side panel next to the transcript" width="900">
</p>

*Side panel (fullscreen UI, 110+ columns).*

<p align="center">
  <img src="images/horizontal.png" alt="OpenSpec HUD inline above the prompt" width="700">
</p>

*Inline bar above the prompt (classic UI or narrow terminal).*

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

## Quick start

1. Install the plugin (below).
2. Open a Claude Code session in a repo that uses OpenSpec, and run an OpenSpec command such as `/opsx:propose <idea>`.
3. The HUD follows along: flow step, tasks, context and usage update as you work.
4. `/openspec-hud` toggles the panel.

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
