import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren } from 'claude-code'

import type { AgentRun, ChangeProgress, FlowStep, McpCall, UsageInfo } from '../types'
import {
  bar,
  fitsSideBySide,
  inferStep,
  isOpenSpecName,
  levelColor,
  limitLabel,
  parseMcpTool,
  parseSlash,
  parseTasks,
  stepOf,
  tokens,
  wrapRows,
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
    const inner = width - 2

    type Cell = { len: number; node: RenderChildren }
    const line = (key: string, body: RenderChildren) => (
      <Text key={key} wrap="truncate-end">{body}</Text>
    )
    /** `a` and `b` share one row when both fit, else they stack in order. */
    const pair = (key: string, a: Cell, b?: Cell) =>
      b && fitsSideBySide(a.len, b.len, inner)
        ? [line(key, <Text>{a.node}{'  '}{b.node}</Text>)]
        : [line(key, a.node), ...(b ? [line(`${key}-2`, b.node)] : [])]
    /** Free text over up to 2 rows: `lead` opens row 0, continuation rows indent under the glyph. */
    const wrapped = (key: string, lead: RenderChildren, leadLen: number, text: string, color: string) =>
      wrapRows(text, inner - 2, 2, inner - leadLen).map((t, i) =>
        line(
          `${key}-${i}`,
          i === 0 ? (
            <Text>{lead}<Text color={color}>{t}</Text></Text>
          ) : (
            <Text color={color}>{`  ${t}`}</Text>
          ),
        ),
      )

    const rows: RenderChildren[] = []

    const changeCell: Cell = change
      ? { len: change.name.length, node: <Text bold color={C.change}>{change.name}</Text> }
      : { len: 16, node: <Text color={C.muted}>no active change</Text> }
    const flowCell: Cell = {
      len: (step ? 2 + step.length : 1) + 3 + (skill ?? '—').length,
      node: (
        <Text>
          {step ? <Text bold color={C.stepNow}>● {step}</Text> : <Text color={C.muted}>—</Text>}
          <Text color={C.sep}> · </Text>
          <Text bold color={C.skill}>{skill ?? '—'}</Text>
        </Text>
      ),
    }
    rows.push(...pair('change', changeCell, flowCell))

    if (change && change.total > 0) {
      const left = change.total - change.done
      const counts = ` ${change.done}/${change.total} · ${left} left`
      rows.push(
        line(
          'tasks',
          <Text>
            <Text color={C.done}>
              {bar((change.done / change.total) * 100, Math.max(8, width - counts.length - 2))}
            </Text>
            <Text bold color={C.done}>{` ${change.done}`}</Text>
            <Text color={C.sep}>/</Text>
            <Text color={C.total}>{change.total}</Text>
            <Text color={C.sep}> · </Text>
            <Text bold color={left === 0 ? C.done : C.remaining}>{left} left</Text>
          </Text>,
        ),
      )
      if (change.current) {
        rows.push(...wrapped('now', <Text bold color={C.now}>▶ </Text>, 2, change.current, C.nowText))
      }
      if (change.next) {
        rows.push(...wrapped('next', <Text color={C.next}>○ </Text>, 2, change.next, C.muted))
      }
    }

    const agent = agents[0]
    if (agent) {
      const extra = agents.length > 1 ? ` +${agents.length - 1}` : ''
      const leadLen = 2 + agent.type.length + 3 + agent.status.length + extra.length + 3
      rows.push(
        ...wrapped(
          'agents',
          <Text>
            <Text bold color={C.agent}>⚙ </Text>
            <Text bold color={C.agentType}>{agent.type}</Text>
            <Text color={C.sep}> · </Text>
            <Text color={statusColor(agent.status)}>{agent.status}</Text>
            <Text color={C.muted}>{extra}</Text>
            <Text color={C.sep}> · </Text>
          </Text>,
          leadLen,
          agent.description,
          C.nowText,
        ),
      )
    }

    const call = mcpCalls[0]
    if (call) {
      const prefix = `${call.server} › `
      const extra = mcpCalls.length > 1 ? ` +${mcpCalls.length - 1}` : ''
      const mcpRows = wrapRows(`${prefix}${call.tool}${extra}`, inner - 2, 2)
      mcpRows.forEach((t, i) =>
        rows.push(
          line(
            `mcp-${i}`,
            i === 0 ? (
              <Text>
                <Text bold color={C.mcp}>⇄ </Text>
                {t.startsWith(prefix) ? (
                  <Text>
                    <Text bold color={C.mcpServer}>{call.server}</Text>
                    <Text color={C.sep}> › </Text>
                    <Text color={C.mcpTool}>{t.slice(prefix.length)}</Text>
                  </Text>
                ) : (
                  <Text color={C.mcpTool}>{t}</Text>
                )}
              </Text>
            ) : (
              <Text color={C.mcpTool}>{`  ${t}`}</Text>
            ),
          ),
        ),
      )
    }

    if (usage) {
      rows.push(
        line(
          'context',
          <Text>
            <Text color={levelColor(percent)}>{bar(percent, barWidth)}</Text>
            <Text bold color={levelColor(percent)}>{` ${percent}%`}</Text>
          </Text>,
        ),
      )
      const used = `${tokens(usage.tokens ?? 0)} / ${tokens(usage.window)}`
      const cost = usage.costUsd !== undefined ? `$${usage.costUsd.toFixed(2)}` : undefined
      const tokensCell: Cell = {
        len: used.length + (cost ? 3 + cost.length : 0),
        node: (
          <Text>
            <Text color={C.muted}>{used}</Text>
            {cost ? (
              <Text>
                <Text color={C.sep}> · </Text>
                <Text bold color={C.cost}>{cost}</Text>
              </Text>
            ) : null}
          </Text>
        ),
      }
      const limitsCell: Cell | undefined =
        usage.rateLimits.length > 0
          ? {
              len: usage.rateLimits
                .map(r => `${limitLabel(r.kind)} ${r.percentUsed}%`)
                .join(' · ').length,
              node: (
                <Text>
                  {usage.rateLimits.map((r, i) => (
                    <Text key={r.kind}>
                      {i > 0 ? <Text color={C.sep}> · </Text> : null}
                      <Text color={C.limit}>{`${limitLabel(r.kind)} `}</Text>
                      <Text bold color={levelColor(r.percentUsed)}>{`${r.percentUsed}%`}</Text>
                    </Text>
                  ))}
                </Text>
              ),
            }
          : undefined
      rows.push(...pair('usage', tokensCell, limitsCell))
    }

    return (
      <Box flexDirection="column" paddingX={1}>
        {rows}
      </Box>
    )
  })
}
