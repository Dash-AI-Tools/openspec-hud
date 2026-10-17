import { expect, test } from 'claude-code/testing'

import { bar, fitsSideBySide, inferStep, parseMcpTool, parseSlash, parseTasks, stepOf, wrapRows } from '../hooks/openspec'

const TASKS = `## 1. Setup
- [x] 1.1 Create module
- [x] 1.2 Add config
## 2. Core
- [ ] 2.1 Implement parser
- [ ] 2.2 Wire the HUD
- [ ] 2.3 Write docs
`

const BAND = {
  plugin: 'openspec-hud',
  component: 'Pane',
  requestId: 'openspec-hud',
  props: {
    title: 'OpenSpec',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const

test('parses tasks.md progress', async () => {
  const t = parseTasks(TASKS)
  expect(t.total).toBe(5)
  expect(t.done).toBe(2)
  expect(t.current).toBe('2.1 Implement parser')
  expect(t.next).toBe('2.2 Wire the HUD')
})

test('maps OpenSpec skills and commands to flow steps', async () => {
  expect(stepOf('openspec-apply-change')).toBe('apply')
  expect(stepOf('opsx:propose')).toBe('propose')
  expect(stepOf('opsx:ff')).toBe('propose')
  expect(stepOf('opsx:archive')).toBe('archive')
  expect(stepOf('openspec-explore')).toBe('explore')
  expect(parseSlash('/opsx:apply add-dark-mode')).toEqual({ command: 'opsx:apply', arg: 'add-dark-mode' })
  expect(parseSlash('/commit')).toBe(null)
  expect(bar(50, 10)).toBe('█████░░░░░')
})

test('infers the step from the change files', async () => {
  const base = { name: 'x', hasProposal: true, hasDesign: false, hasSpecs: true }
  expect(inferStep({ ...base, hasTasks: false, total: 0, done: 0 })).toBe('propose')
  expect(inferStep({ ...base, hasTasks: true, total: 3, done: 1 })).toBe('apply')
  expect(inferStep({ ...base, hasTasks: true, total: 3, done: 3 })).toBe('verify')
})

test('band shows skill, step, tasks, agents and context', async ($, on) => {
  on('fs.list', ($, e) => {
    if (e.path.endsWith('openspec/changes')) {
      return {
        value: [
          { name: 'add-dark-mode', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
          { name: 'archive', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
        ],
      }
    }
    return {
      value: [
        { name: 'proposal.md', kind: 'file', size: 10, mtimeMs: 1, isLink: false },
        { name: 'tasks.md', kind: 'file', size: 10, mtimeMs: 2, isLink: false },
        { name: 'specs', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
      ],
    }
  })
  on('fs.read', () => ({ value: TASKS }))
  on('skill.prompt', (_$, e) => ({ text: e.text }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('clock.now', () => ({ value: 0 }))
  on('agent.spawn', () => ({ model: 'haiku', agentId: 'a1' }))

  await $.skill.prompt({ skill: 'openspec-apply-change', text: '' })
  await $.agent.spawn({
    tool_use_id: 't1',
    prompt: 'look',
    description: 'Find theme code',
    subagentType: 'Explore',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'opus',
    background: false,
    fork: false,
  })
  await $.session.measure({
    context: { tokens: 84000, window: 200000, percent: 42 },
    rateLimits: [{ kind: 'five_hour', percentUsed: 23 }],
    cost: { usd: 1.5 },
    changed: ['context'],
  })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    for (const text of [/^add-dark-mode$/, /● apply/, /openspec-apply-change/, /3 left/, /^2\.1 Implement parser$/, /^2\.2 Wire the HUD$/, /Explore/, /running/, /Find theme code/, /42%/, /84k \/ 200k/, /5h/, /\$1\.50/]) {
      expect(await ui.find({ type: 'Text', text })).toBeDefined()
    }
    const colorOf = async (text: RegExp) => (await ui.find({ type: 'Text', text }))?.props.color
    for (const gone of [/^CHANGE$/, /^FLOW$/, /^TASKS$/, /^CONTEXT$/, /OpenSpec HUD/]) {
      expect(await ui.find({ type: 'Text', text: gone })).toBeUndefined()
    }
    expect(await colorOf(/^running$/)).toBe('warning')
    expect(await colorOf(/^2\.1 Implement parser$/)).toBe('text')
    expect(await ui.find({ type: 'Text', text: /propose|verify|archive/ })).toBeUndefined()
    expect(await colorOf(/^Explore$/)).toBe('merged')
    expect(await colorOf(/^ 42%$/)).toBe('success')
    await ui.unmount()
  }
})

test('wraps text to at most N rows with an ellipsis', async () => {
  const text = 'write the wrapping helper now'
  expect(wrapRows('short task', 20, 2)).toEqual(['short task'])
  expect(wrapRows(text, 16, 3)).toEqual(['write the', 'wrapping helper', 'now'])
  expect(wrapRows(text, 16, 2)).toEqual(['write the', 'wrapping helper…'])
  expect(wrapRows('x'.repeat(10), 4, 3)).toEqual(['xxxx', 'xxxx', 'xx'])
  expect(wrapRows('x'.repeat(10), 4, 2)).toEqual(['xxxx', 'xxx…'])
  expect(wrapRows('ab cdefgh', 8, 2, 4)).toEqual(['ab', 'cdefgh'])
})

test('pairs rows only when both fit with a 2-column gap', async () => {
  expect(fitsSideBySide(10, 8, 20)).toBe(true)
  expect(fitsSideBySide(10, 9, 20)).toBe(false)
  expect(fitsSideBySide(0, 0, 2)).toBe(true)
})

test('parses MCP tool names', async () => {
  expect(parseMcpTool('mcp__github__get_me')).toEqual({ server: 'github', tool: 'get_me' })
  expect(parseMcpTool('mcp__claude-code-remote__list_repos')).toEqual({ server: 'claude-code-remote', tool: 'list_repos' })
  expect(parseMcpTool('Bash')).toBe(null)
})

test('shows the MCP server and tool only while the call runs', async ($, on) => {
  let release = () => {}
  let started = () => {}
  const held = new Promise<void>(resolve => (release = resolve))
  const running = new Promise<void>(resolve => (started = resolve))
  on('tool.call', async () => {
    started()
    await held
    return { result: 'ok' }
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /mcp/ })).toBeUndefined()

  const call = $.tool.call({ tool: 'mcp__github__get_me', tool_use_id: 'm1' } as never)
  await running
  expect(await ui.find({ type: 'Text', text: /github/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /get_me/ })).toBeDefined()

  release()
  await call
  expect(await ui.find({ type: 'Text', text: /github/ })).toBeUndefined()
  await ui.unmount()
})

const at = (bodyColumns: number) => ({ ...BAND, props: { ...BAND.props, bodyColumns } })

const rowCount = async (ui: { findAll: (q: object) => Promise<{ props?: { wrap?: string } }[]> }) =>
  (await ui.findAll({ type: 'Text' })).filter(t => t.props?.wrap === 'truncate-end').length

test('body stays within 10 rows when fully populated and 8 when typical', async ($, on) => {
  on('fs.list', (_$, e) =>
    e.path.endsWith('openspec/changes')
      ? { value: [{ name: 'add-dark-mode', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] }
      : {
          value: [
            { name: 'tasks.md', kind: 'file', size: 10, mtimeMs: 2, isLink: false },
            { name: 'specs', kind: 'dir', size: 0, mtimeMs: 0, isLink: false },
          ],
        },
  )
  on('fs.read', () => ({ value: TASKS }))
  on('skill.prompt', (_$, e) => ({ text: e.text }))
  on('session.measure', (_$, e) => ({ changed: e.changed }))
  on('clock.now', () => ({ value: 0 }))
  let n = 0
  on('agent.spawn', () => ({ model: 'haiku', agentId: `a${(n += 1)}` }))
  let release = () => {}
  let started = () => {}
  const held = new Promise<void>(resolve => (release = resolve))
  const running = new Promise<void>(resolve => (started = resolve))
  on('tool.call', async () => {
    started()
    await held
    return { result: 'ok' }
  })

  await $.skill.prompt({ skill: 'openspec-apply-change', text: '' })
  await $.session.measure({
    context: { tokens: 84000, window: 200000, percent: 42 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 23 },
      { kind: 'seven_day', percentUsed: 8 },
    ],
    cost: { usd: 1.5 },
    changed: ['context'],
  })

  const ui = await $.ui.mount({ ...at(35), surface: 'terminal' })
  const desktop = await $.ui.mount({ ...at(35), surface: 'desktop' })
  expect(await rowCount(ui)).toBe(8)
  expect(await rowCount(desktop)).toBe(8)

  for (const description of ['Scan', 'Check specs']) {
    await $.agent.spawn({
      tool_use_id: description,
      prompt: 'look',
      description,
      subagentType: 'Explore',
      provider: { plugin: 'engine', tier: 'core' },
      parentModel: 'opus',
      background: false,
      fork: false,
    })
  }
  const call = $.tool.call({ tool: 'mcp__github__get_me', tool_use_id: 'm1' } as never)
  await running

  expect(await rowCount(ui)).toBeLessThanOrEqual(10)
  expect(await rowCount(desktop)).toBeLessThanOrEqual(10)
  expect(await ui.find({ type: 'Text', text: /\+1/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /7d/ })).toBeDefined()

  release()
  await call
  await ui.unmount()
  await desktop.unmount()
})
