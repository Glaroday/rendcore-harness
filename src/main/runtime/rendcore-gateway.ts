import { createHash, randomBytes } from 'node:crypto'
import { createServer, request, type IncomingMessage, type ServerResponse } from 'node:http'

export const RENDCORE_API_ENDPOINTS = [
  'http://47.103.24.134:18036/v1',
  'http://a.88frp.asia:8317/v1'
] as const
export const RENDCORE_CAPABILITIES_ENDPOINT = 'http://47.103.24.134:8600/api/models'

export interface RendCoreGateway {
  baseURL: string
  close(): Promise<void>
}

interface GatewayOptions {
  endpoints?: readonly string[]
  probeTimeoutMs?: number
  healthTtlMs?: number
  log?: (line: string) => void
}

function modelList(value: unknown): boolean {
  if (!value || typeof value !== 'object' || !('data' in value)) return false
  return Array.isArray(value.data) && value.data.length > 0 && value.data.every(
    (row: unknown) => row !== null && typeof row === 'object' && 'id' in row && typeof row.id === 'string'
  )
}

function fail(response: ServerResponse, status: number, message: string): void {
  if (response.destroyed) return
  response.writeHead(status, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify({ error: { type: 'api_error', message } }))
}

/** Host-owned, loopback-only bridge. Keys stay on requests, never in patches or logs.
 * Probe GETs may race; generation POSTs are sent exactly once, never replayed.
 */
export async function startRendCoreGateway(options: GatewayOptions = {}): Promise<RendCoreGateway> {
  const endpoints = options.endpoints ?? RENDCORE_API_ENDPOINTS
  if (endpoints.length === 0) throw new Error('No RendCore endpoints configured')
  const prefix = `/rendcore-${randomBytes(24).toString('hex')}`
  const shutdown = new AbortController()
  const cooldown = new Map<string, number>()
  let healthy: { endpoint: string; keyHash: string; until: number } | undefined
  let lastEndpoint: string | undefined
  const pending = new Map<string, Promise<string>>()

  async function discover(authorization: string): Promise<string> {
    const keyHash = createHash('sha256').update(authorization).digest('hex')
    if (healthy?.keyHash === keyHash && healthy.until > Date.now()) return healthy.endpoint
    const existing = pending.get(keyHash)
    if (existing) return existing
    const probing = (async () => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), options.probeTimeoutMs ?? 3_000)
      const signal = AbortSignal.any([controller.signal, shutdown.signal])
      const authenticationFailures: string[] = []
      const available = endpoints.filter(endpoint => (cooldown.get(endpoint) ?? 0) <= Date.now())
      try {
        const endpoint = await Promise.any((available.length ? available : endpoints).map(async endpoint => {
          const response = await fetch(`${endpoint}/models`, {
            headers: { Authorization: authorization }, redirect: 'error', signal
          })
          if (response.status === 401 || response.status === 403) {
            authenticationFailures.push(endpoint)
            await response.body?.cancel()
            throw new Error('authentication')
          }
          if (!response.ok) {
            await response.body?.cancel()
            throw new Error('unavailable')
          }
          if (!modelList(await response.json())) throw new Error('invalid model list')
          return endpoint
        }))
        healthy = { endpoint, keyHash, until: Date.now() + (options.healthTtlMs ?? 15_000) }
        if (endpoint !== lastEndpoint) {
          options.log?.(`[desktop] RendCore API selected ${endpoint}`)
          lastEndpoint = endpoint
        }
        return endpoint
      } catch {
        // Forward the real authentication response rather than reporting a bad key as an outage.
        const authenticationEndpoint = authenticationFailures[0]
        if (authenticationEndpoint) return authenticationEndpoint
        throw new Error('RendCore API endpoints are unavailable; retry shortly.')
      } finally {
        clearTimeout(timer)
        controller.abort()
      }
    })()
    pending.set(keyHash, probing)
    try { return await probing } finally { pending.delete(keyHash) }
  }

  async function forward(incoming: IncomingMessage, response: ServerResponse): Promise<void> {
    const route = incoming.url?.slice(prefix.length)
    const validRoute = incoming.url?.startsWith(`${prefix}/v1/`) && route && (
      incoming.method === 'GET' && route === '/v1/models' ||
      incoming.method === 'POST' && /^\/v1\/(chat\/completions|completions|responses|embeddings|images\/(generations|edits)|audio\/(transcriptions|translations|speech))$/.test(route)
    )
    if (!validRoute) { fail(response, 404, 'Not found'); return }
    const authorization = incoming.headers.authorization
    if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
      fail(response, 401, 'Enter your RendCore API key in Settings.'); return
    }
    let endpoint: string
    try { endpoint = await discover(authorization) } catch {
      fail(response, 503, 'RendCore API endpoints are unavailable; retry shortly.'); return
    }
    if (shutdown.signal.aborted || response.destroyed) return
    const headers: Record<string, string> = { Authorization: authorization }
    for (const name of ['content-type', 'content-length', 'accept', 'openai-beta', 'openai-organization', 'openai-project']) {
      const value = incoming.headers[name]
      if (typeof value === 'string') headers[name] = value
    }
    const target = `${endpoint}${route.slice('/v1'.length)}`
    const upstream = request(target, { method: incoming.method, headers, signal: shutdown.signal }, reply => {
      // No redirect following: a compromised gateway cannot send the user's key elsewhere.
      if ((reply.statusCode ?? 0) >= 500) invalidate()
      const connectionHeaders = new Set((reply.headers.connection ?? '').split(',').map(value => value.trim().toLowerCase()))
      for (const [name, value] of Object.entries(reply.headers)) {
        if (value !== undefined && !connectionHeaders.has(name) &&
          !['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'trailer', 'proxy-authenticate', 'proxy-authorization', 'set-cookie', 'location'].includes(name)) {
          response.setHeader(name, value)
        }
      }
      response.writeHead(reply.statusCode ?? 502)
      response.flushHeaders()
      reply.on('error', () => response.destroy())
      reply.on('aborted', () => { invalidate(); response.destroy() })
      reply.pipe(response)
    })
    function invalidate(): void {
      if (healthy?.endpoint === endpoint) healthy = undefined
      cooldown.set(endpoint, Date.now() + 15_000)
    }
    // Reasoning models can remain silent for several minutes before their first event.
    upstream.setTimeout(600_000, () => upstream.destroy(new Error('upstream timeout')))
    upstream.on('error', () => {
      invalidate()
      // The server may already have accepted a POST. Do not silently charge twice.
      if (response.headersSent) response.destroy()
      else fail(response, 502, 'RendCore connection failed. The next request will probe another endpoint.')
    })
    incoming.on('aborted', () => upstream.destroy())
    response.on('close', () => upstream.destroy())
    incoming.pipe(upstream)
  }

  const server = createServer((incoming, response) => {
    void forward(incoming, response).catch(() => {
      if (response.headersSent) response.destroy()
      else fail(response, 502, 'RendCore gateway request failed.')
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve() })
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('RendCore loopback listener has no address')
  let closing: Promise<void> | undefined
  return {
    baseURL: `http://127.0.0.1:${address.port}${prefix}/v1`,
    close() {
      closing ??= new Promise<void>((resolve, reject) => {
        shutdown.abort()
        server.close(error => error ? reject(error) : resolve())
        server.closeAllConnections()
      })
      return closing
    }
  }
}
