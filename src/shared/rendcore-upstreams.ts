export type RendCoreUpstreamStatus = 'available' | 'auth-required' | 'unavailable'

export interface RendCoreUpstreamSnapshot {
  preferred: string | null
  selected: string | null
  endpoints: { url: string; status?: RendCoreUpstreamStatus }[]
}

export const RENDCORE_UPSTREAM_IPC = {
  read: 'rendcore-upstreams:read', probe: 'rendcore-upstreams:probe', save: 'rendcore-upstreams:save'
} as const
