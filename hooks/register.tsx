import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren } from 'claude-code'

import type { AgentRun, ChangeProgress, FlowStep, McpCall, UsageInfo } from '../types'
import {
  bar,
  inferStep,
  isOpenSpecName,
  levelColor,
  limitLabel,
  parseMcpTool,
  parseSlash,
  parseTasks,
  stepOf,
  tokens,
} from './openspec'

const skillA = atom({ plugin: 'openspec-hud', key: 'skill' } as const, null)
const stepA = atom({ plugin: 'openspec-hud', key: 'step' } as const, null)
const changeA = atom({ plugin: 'openspec-hud', key: 'change' } as const, null)
const agentsA = atom({ plugin: 'openspec-hud', key: 'agents' } as const, [])
const mcpA = atom({ plugin: 'openspec-hud', key: 'mcpCalls' } as const, [])
const usageA = atom({ plugin: 'openspec-hud', key: 'usage' } as const, null)
const hiddenA = atom({ plugin: 'openspec-hud', key: 'isHidden' } as const, false)

const CHANGES = 'openspec/changes'

/** One theme color per kind of info, so each reads apart at a glance. */
const PANE = 'openspec-hud'
const PANE_ARGS = { id: PANE, title: 'OpenSpec', columns: 42 } as const

const C = {
  brand: 'claude',
  change: 'suggestion',
  stepNow: 'warning',
  skill: 'autoAccept',
  label: 'subtle',
  sep: 'inactive',
  muted: 'inactive',
  done: 'success',
  total: 'text',
  remaining: 'warning',
  now: 'warning',
  nowText: 'text',
  next: 'suggestion',
  agent: 'planMode',
  agentType: 'merged',
  mcp: 'bashBorder',
  mcpServer: 'ide',
  mcpTool: 'permission',
  limit: 'remember',
  cost: 'merged',
} as const

function statusColor(status: string): 'warning' | 'success' | 'error' | 'subtle' {
  if (status === 'running') return 'warning'
  if (status === 'completed') return 'success'
  if (status === 'failed' || status === 'killed') return 'error'
  return 'subtle'
}
const DONE = new Set(['completed', 'failed', 'killed'])

let preferred: string | undefined
let tick = 0

async function scanChange($: EngineInterface): Promise<void> {
  let found: ChangeProgress | null = null
  try {
    const dirs = (await $.fs.list(CHANGES)).filter(
      d => d.kind === 'dir' && d.name !== 'archive',
    )
    let best: { c: ChangeProgress; at: number } | null = null
    for (const dir of dirs) {
      const base = `${CHANGES}/${dir.name}`
      const files = await $.fs.list(base)
      const file = (n: string) => files.find(f => f.name === n)
      const tasksFile = file('tasks.md')
      const parsed = tasksFile
        ? parseTasks(await $.fs.read(`${base}/tasks.md`))
        : { total: 0, done: 0 }
      const c: ChangeProgress = {
        name: dir.name,
        ...parsed,
        hasProposal: !!file('proposal.md'),
        hasDesign: !!file('design.md'),
        hasSpecs: files.some(f => f.name === 'specs' && f.kind === 'dir'),
        hasTasks: !!tasksFile,
      }
      const at =
        dir.name === preferred
          ? Number.MAX_SAFE_INTEGER
          : Math.max(0, ...files.map(f => f.mtimeMs))
      if (!best || at > best.at) best = { c, at }
    }
    found = best?.c ?? null
  } catch {
    found = null
  }
  await update($, changeA, () => found)
}

async function refreshAgents($: EngineInterface): Promise<void> {
  const tracked = await read($, agentsA)
  if (tracked.length === 0) return
  const live = await $.agent.list()
  await update($, agentsA, list =>
    list
      .map(a => {
        const now = live.find(l => l.id === a.id)
        return now ? { ...a, status: now.status, description: now.description } : a
      })
      .filter(a => !DONE.has(a.status) && live.some(l => l.id === a.id)),
  )
}

async function setSkill($: EngineInterface, name: string): Promise<void> {
  await update($, skillA, () => name)
  const step = stepOf(name)
  if (step) await update($, stepA, () => step)
}

async function measure($: EngineInterface): Promise<void> {
  const u = await $.session.usage()
  const info: UsageInfo = {
    percent: u.context.percent,
    tokens: u.context.tokens,
    window: u.context.window,
    rateLimits: u.rateLimits.map(r => ({ ...r })),
    costUsd: u.cost?.usd,
  }
  await update($, usageA, () => info)
}


export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'openspec-hud',
      description: 'Show or hide the OpenSpec HUD side panel',
    })
    const ran = await next(e)
    if (!(await read($, hiddenA))) void $.ui.open(PANE_ARGS)
    await Promise.all([scanChange($), measure($).catch(() => undefined)])
    $.clock.every(2000, () => {
      tick += 1
      void refreshAgents($).catch(() => undefined)
      if (tick % 5 === 0) void scanChange($)
    })

    return ran
  })

  on('command.run', { command: 'openspec-hud' }, async $ => {
    const isHidden = await update($, hiddenA, h => !h)
    if (isHidden) await $.ui.close({ id: PANE })
    else await $.ui.open(PANE_ARGS)

    return { text: isHidden ? 'OpenSpec HUD hidden.' : 'OpenSpec HUD shown.' }
  })

  // Closing the panel by hand keeps it closed until /openspec-hud opens it again.
  on('ui.close', { id: PANE }, async ($, e, next) => {
    const ran = await next(e)
    if (e.origin.kind === 'person') await update($, hiddenA, () => true)

    return ran
  })

  on('prompt.submit', async ($, e, next) => {
    const slash = parseSlash(e.text)
    if (slash) {
      if (slash.arg) preferred = slash.arg
      await setSkill($, slash.command)
      void scanChange($)
    }

    return next(e)
  })

  on('skill.prompt', async ($, e, next) => {
    if (isOpenSpecName(e.skill)) {
      await setSkill($, e.skill)
      await scanChange($)
    }

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const ran = await next(e)
    if (ran.agentId) {
      const run: AgentRun = {
        id: ran.agentId,
        type: e.subagentType,
        description: e.description,
        status: 'running',
        startedAt: await $.clock.now(),
      }
      await update($, agentsA, list => [...list.filter(a => a.id !== run.id), run])
    }

    return ran
  })

  on('tool.call', async ($, e, next) => {
    const mcp = parseMcpTool(String(e.tool))
    if (mcp) {
      const call: McpCall = { id: e.tool_use_id, ...mcp }
      await update($, mcpA, list => [...list, call])
      try {
        return await next(e)
      } finally {
        await update($, mcpA, list => list.filter(c => c.id !== call.id))
      }
    }
    const ran = await next(e)
    const fields = e as unknown as Record<string, unknown>
    const target = String(fields.file_path ?? fields.command ?? fields.path ?? '')
    if (target.includes('openspec')) void scanChange($)

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    void scanChange($)
    void refreshAgents($).catch(() => undefined)

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    const info: UsageInfo = {
      percent: e.context.percent,
      tokens: e.context.tokens,
      window: e.context.window,
      rateLimits: e.rateLimits.map(r => ({ ...r })),
      costUsd: e.cost?.usd,
    }
    await update($, usageA, () => info)

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const [skill, explicitStep, change, agents, mcpCalls, usage] = await Promise.all([
      read($, skillA),
      read($, stepA),
      read($, changeA),
      read($, agentsA),
      read($, mcpA),
      read($, usageA),
    ])
    const { Box, Text } = $.ui.resolve(e)
    const step: FlowStep | null = explicitStep ?? (change ? inferStep(change) : null)
    const percent = usage?.percent ?? 0
    const width = Math.max(16, e.props.bodyColumns)
    const barWidth = Math.max(8, width - 7)

    const heading = (label: string, color: string) => (
      <Text bold color={color}>{label}</Text>
    )
    const line = (body: RenderChildren) => <Text wrap="truncate-end">{body}</Text>
    const block = (key: string, children: RenderChildren[]) => (
      <Box key={key} flexDirection="column" marginBottom={1}>
        {children}
      </Box>
    )

    const blocks: RenderChildren[] = []

    blocks.push(
      block('change', [
        heading('CHANGE', C.label),
        change ? (
          line(<Text bold color={C.change}>{change.name}</Text>)
        ) : (
          line(<Text color={C.muted}>no active change</Text>)
        ),
      ]),
    )

    blocks.push(
      block('flow', [
        heading('FLOW', C.label),
        line(
          step ? (
            <Text bold color={C.stepNow}>● {step}</Text>
          ) : (
            <Text color={C.muted}>—</Text>
          ),
        ),
        line(
          <Text>
            <Text color={C.muted}>skill </Text>
            <Text bold color={C.skill}>{skill ?? '—'}</Text>
          </Text>,
        ),
      ]),
    )

    if (change && change.total > 0) {
      const left = change.total - change.done
      blocks.push(
        block('tasks', [
          heading('TASKS', C.label),
          line(<Text color={C.done}>{bar((change.done / change.total) * 100, barWidth)}</Text>),
          line(
            <Text>
              <Text bold color={C.done}>{change.done}</Text>
              <Text color={C.sep}>/</Text>
              <Text color={C.total}>{change.total}</Text>
              <Text color={C.muted}> done  ·  </Text>
              <Text bold color={left === 0 ? C.done : C.remaining}>{left} left</Text>
            </Text>,
          ),
          ...(change.current
            ? [
                <Text bold color={C.now}>▶ now</Text>,
                <Text color={C.nowText}>{change.current}</Text>,
              ]
            : []),
          ...(change.next
            ? [
                <Text color={C.next}>○ next</Text>,
                <Text color={C.muted}>{change.next}</Text>,
              ]
            : []),
        ]),
      )
    }

    if (agents.length > 0) {
      blocks.push(
        block(
          'agents',
          [heading('⚙ AGENTS', C.agent)].concat(
            agents.map(a => (
              <Box key={`agent-${a.id}`} flexDirection="column">
                {line(
                  <Text>
                    <Text bold color={C.agentType}>{a.type}</Text>
                    <Text color={C.sep}> · </Text>
                    <Text color={statusColor(a.status)}>{a.status}</Text>
                  </Text>,
                )}
                {line(<Text color={C.nowText}>{a.description}</Text>)}
              </Box>
            )),
          ),
        ),
      )
    }

    if (mcpCalls.length > 0) {
      blocks.push(
        block(
          'mcp',
          [heading('⇄ MCP', C.mcp)].concat(
            mcpCalls.map(c =>
              line(
                <Text key={`mcp-${c.id}`}>
                  <Text bold color={C.mcpServer}>{c.server}</Text>
                  <Text color={C.sep}> › </Text>
                  <Text color={C.mcpTool}>{c.tool}</Text>
                </Text>,
              ),
            ),
          ),
        ),
      )
    }

    if (usage) {
      blocks.push(
        block('usage', [
          heading('CONTEXT', C.label),
          line(
            <Text>
              <Text color={levelColor(percent)}>{bar(percent, barWidth)}</Text>
              <Text bold color={levelColor(percent)}>{` ${percent}%`}</Text>
            </Text>,
          ),
          line(<Text color={C.muted}>{`${tokens(usage.tokens ?? 0)} / ${tokens(usage.window)} tokens`}</Text>),
          ...usage.rateLimits.map(r =>
            line(
              <Text>
                <Text color={C.limit}>{limitLabel(r.kind).padEnd(6)}</Text>
                <Text color={levelColor(r.percentUsed)}>{bar(r.percentUsed, barWidth - 6)}</Text>
                <Text bold color={levelColor(r.percentUsed)}>{` ${r.percentUsed}%`}</Text>
              </Text>,
            ),
          ),
          ...(usage.costUsd !== undefined
            ? [
                line(
                  <Text>
                    <Text color={C.muted}>cost </Text>
                    <Text bold color={C.cost}>${usage.costUsd.toFixed(2)}</Text>
                  </Text>,
                ),
              ]
            : []),
        ]),
      )
    }

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box marginBottom={1}>
          <Text bold color={C.brand}>◆ OpenSpec HUD</Text>
        </Box>
        {blocks}
      </Box>
    )
  })
}
