export type RendCoreUpstreamStatus = 'available' | 'auth-required' | 'unavailable'

export interface RendCoreUpstreamSnapshot {
  preferred: string | null
  selected: string | null
  endpoints: { url: string; status?: RendCoreUpstreamStatus }[]
}

export interface RendCoreModelSummary {
  id: string
  name: string
  contextWindow?: number
  maxTokens?: number
  input: Array<'text' | 'image'>
  reasoningEfforts?: false | Record<string, string | null>
}

export interface RendCoreModelRefreshResult {
  ok: boolean
  models: RendCoreModelSummary[]
  source?: 'online' | 'capabilities' | 'cache' | 'bundled'
  applied?: boolean
  changed?: boolean
  error?: string
}

export const RENDCORE_UPSTREAM_IPC = {
  read: 'rendcore-upstreams:read',
  probe: 'rendcore-upstreams:probe',
  save: 'rendcore-upstreams:save',
  refreshModels: 'rendcore-models:refresh'
} as const
