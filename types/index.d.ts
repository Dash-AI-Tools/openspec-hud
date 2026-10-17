export type FlowStep =
  | 'explore'
  | 'propose'
  | 'design'
  | 'apply'
  | 'verify'
  | 'sync'
  | 'archive'
  | 'onboard'

export type ChangeProgress = {
  name: string
  total: number
  done: number
  current?: string
  next?: string
  hasProposal: boolean
  hasDesign: boolean
  hasSpecs: boolean
  hasTasks: boolean
}

export type AgentRun = {
  id: string
  type: string
  description: string
  status: string
  startedAt: number
}

export type McpCall = {
  id: string
  server: string
  tool: string
}

export type UsageInfo = {
  percent?: number
  tokens?: number
  window: number
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]
  costUsd?: number
}

declare module 'claude-code' {
  interface PluginState {
    'openspec-hud': {
      skill: string | null
      step: FlowStep | null
      change: ChangeProgress | null
      changes: ChangeProgress[]
      changesShown: boolean
      agents: AgentRun[]
      mcpCalls: McpCall[]
      usage: UsageInfo | null
      isHidden: boolean
    }
  }
}
