import type { ChangeProgress, FlowStep } from '../types'

export const FLOW: FlowStep[] = ['explore', 'propose', 'apply', 'verify', 'archive']

const STEP_WORDS: [RegExp, FlowStep][] = [
  [/onboard/, 'onboard'],
  [/explore/, 'explore'],
  [/apply|implement/, 'apply'],
  [/verify|validate/, 'verify'],
  [/sync/, 'sync'],
  [/archive/, 'archive'],
  [/continue|design/, 'design'],
  [/propose|proposal|new|ff|fast-forward/, 'propose'],
]

export function isOpenSpecName(name: string): boolean {
  return /opsx|openspec/i.test(name)
}

export function stepOf(name: string): FlowStep | null {
  const lower = name.toLowerCase()
  const tail = lower.replace(/^.*?(opsx|openspec)[:\-_/]?/, '')
  for (const [re, step] of STEP_WORDS) {
    if (re.test(tail)) return step
  }
  return null
}

/** `/opsx:apply my-change` -> { command: 'opsx:apply', arg: 'my-change' } */
export function parseSlash(text: string): { command: string; arg?: string } | null {
  const m = /^\s*\/([\w:.-]+)(?:\s+([\w.-]+))?/.exec(text)
  const command = m?.[1]
  if (!m || !command || !isOpenSpecName(command)) return null
  return { command, arg: m[2] }
}

export type ParsedTasks = { total: number; done: number; current?: string; next?: string }

export function parseTasks(md: string): ParsedTasks {
  let total = 0
  let done = 0
  const open: string[] = []
  for (const line of md.split('\n')) {
    const m = /^\s*[-*]\s+\[([ xX])\]\s+(.*\S)\s*$/.exec(line)
    const text = m?.[2]
    if (!m || text === undefined) continue
    total += 1
    if (m[1] === ' ') open.push(text)
    else done += 1
  }
  return { total, done, current: open[0], next: open[1] }
}

/** The step the change's files imply when no OpenSpec skill says otherwise. */
export function inferStep(c: ChangeProgress): FlowStep {
  if (!c.hasTasks || c.total === 0) return 'propose'
  if (c.done < c.total) return 'apply'
  return 'verify'
}

/** Where a step sits on the main flow line. */
export function flowIndex(step: FlowStep): number {
  if (step === 'design') return FLOW.indexOf('propose')
  if (step === 'sync') return FLOW.indexOf('verify')
  if (step === 'onboard') return 0
  return FLOW.indexOf(step)
}

export function bar(percent: number, width: number): string {
  const w = Math.max(4, width)
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * w)
  return '█'.repeat(filled) + '░'.repeat(w - filled)
}

export function tokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

export function levelColor(percent: number): 'success' | 'warning' | 'error' {
  if (percent < 60) return 'success'
  if (percent < 85) return 'warning'
  return 'error'
}

export function limitLabel(kind: string): string {
  if (kind === 'five_hour') return '5h'
  if (kind === 'seven_day') return '7d'
  if (kind === 'spend_limit') return 'spend'
  return kind
}

/** `mcp__github__get_me` -> { server: 'github', tool: 'get_me' }; null for a built-in tool. */
export function parseMcpTool(name: string): { server: string; tool: string } | null {
  const m = /^mcp__(.+?)__(.+)$/.exec(name)
  const server = m?.[1]
  const tool = m?.[2]
  if (!server || !tool) return null
  return { server, tool }
}
