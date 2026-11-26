import { createServer, type RequestListener } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { startRendCoreGateway, type RendCoreGateway } from '../src/main/runtime/rendcore-gateway'

const cleanup: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const close of cleanup.splice(0).reverse()) await close()
})

async function upstream(handler: RequestListener): Promise<string> {
  const server = createServer(handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  cleanup.push(() => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
    server.closeAllConnections()
  }))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('missing test address')
  return `http://127.0.0.1:${address.port}/v1`
}

async function gateway(endpoints: string[], log?: (line: string) => void): Promise<RendCoreGateway> {
  const value = await startRendCoreGateway({ endpoints, probeTimeoutMs: 150, log })
  cleanup.push(() => value.close())
  return value
}

const auth = { Authorization: 'Bearer fixture-not-a-real-key', 'Content-Type': 'application/json' }
const models = JSON.stringify({ data: [{ id: 'fixture-model' }] })

describe('RendCore automatic API routing', () => {
  it('uses a healthy alternate, streams SSE verbatim and forwards the user key and body', async () => {
    const captured: string[] = []
    const broken = await upstream((_req, res) => { res.writeHead(503); res.end('offline') })
    const healthy = await upstream((req, res) => {
      expect(req.headers.authorization).toBe(auth.Authorization)
      if (req.url === '/v1/models') { res.end(models); return }
      let body = ''
      req.on('data', chunk => { body += String(chunk) })
      req.on('end', () => {
        captured.push(body)
        res.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive', 'Set-Cookie': 'untrusted=1' })
        res.write('data: {"choices":[{"delta":{"content":"hello"}}]}\n\n')
        setTimeout(() => res.end('data: [DONE]\n\n'), 20)
      })
    })
    const logs: string[] = []
    const bridge = await gateway([broken, healthy], line => logs.push(line))
    const body = '{"model":"fixture-model","stream":true}'
    const response = await fetch(`${bridge.baseURL}/chat/completions`, { method: 'POST', headers: auth, body })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream')
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(await response.text()).toBe('data: {"choices":[{"delta":{"content":"hello"}}]}\n\ndata: [DONE]\n\n')
    expect(captured).toEqual([body])
    expect(logs.join()).toContain(healthy)
    expect(logs.join()).not.toContain('fixture-not-a-real-key')
  })

  it('uses the backup after the shared probe deadline', async () => {
    const stalled = await upstream(() => {})
    const live = await upstream((_req, res) => res.end(models))
    const bridge = await startRendCoreGateway({ endpoints: [stalled, live], probeTimeoutMs: 400 })
    cleanup.push(() => bridge.close())
    const response = await fetch(`${bridge.baseURL}/models`, { headers: auth, signal: AbortSignal.timeout(1_500) })
    expect(await response.json()).toEqual(JSON.parse(models))
  })

  it('prefers the primary even if a backup is faster, and applies a new preference without a restart', async () => {
    const primary = await upstream((_req, res) => { setTimeout(() => res.end(models), 30) })
    const backup = await upstream((_req, res) => res.end(models))
    let preferred: string | undefined
    const selected: string[] = []
    const bridge = await startRendCoreGateway({ endpoints: [primary, backup], preferredEndpoint: () => preferred, onSelected: endpoint => selected.push(endpoint) })
    cleanup.push(() => bridge.close())
    await (await fetch(`${bridge.baseURL}/models`, { headers: auth })).text()
    preferred = backup
    await (await fetch(`${bridge.baseURL}/models`, { headers: auth })).text()
    expect(selected).toEqual([primary, backup])
  })

  it('does not choose an authentication failure over a key accepted by the other endpoint', async () => {
    const rejected = await upstream((_req, res) => { res.writeHead(401); res.end('{"error":"invalid key"}') })
    const accepted = await upstream((_req, res) => res.end(models))
    const bridge = await gateway([rejected, accepted])
    const response = await fetch(`${bridge.baseURL}/models`, { headers: auth })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(JSON.parse(models))
  })

  it('preserves a bad-key error instead of disguising it as an outage', async () => {
    const rejected = await upstream((_req, res) => { res.writeHead(401); res.end('{"error":"invalid key"}') })
    const bridge = await gateway([rejected])
    const response = await fetch(`${bridge.baseURL}/chat/completions`, { method: 'POST', headers: auth, body: '{}' })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: 'invalid key' })
  })

  it('rejects HTML success pages, reports both unavailable and does not follow redirects', async () => {
    let leaked = false
    const trap = await upstream((_req, res) => { leaked = true; res.end(models) })
    const redirect = await upstream((_req, res) => { res.writeHead(302, { Location: `${trap}/models` }); res.end() })
    const html = await upstream((_req, res) => res.end('<html>not an API</html>'))
    const bridge = await gateway([redirect, html])
    const response = await fetch(`${bridge.baseURL}/models`, { headers: auth })
    expect(response.status).toBe(503)
    expect(leaked).toBe(false)
  })

  it('invalidates a failed cached route and switches on the next request without replaying a POST', async () => {
    let firstPosts = 0
    let secondPosts = 0
    const first = await upstream((req, res) => {
      if (req.url === '/v1/models') { res.end(models); return }
      firstPosts++
      req.socket.destroy()
    })
    const second = await upstream((req, res) => {
      if (req.url === '/v1/models') { setTimeout(() => res.end(models), 25); return }
      secondPosts++
      res.end('{"ok":true}')
    })
    const bridge = await gateway([first, second])
    const initial = await fetch(`${bridge.baseURL}/chat/completions`, { method: 'POST', headers: auth, body: '{}' })
    expect(initial.status).toBe(502)
    await initial.text()
    expect(secondPosts).toBe(0)
    const retried = await fetch(`${bridge.baseURL}/chat/completions`, { method: 'POST', headers: auth, body: '{}' })
    expect(retried.status).toBe(200)
    await retried.text()
    expect(firstPosts).toBe(1)
    expect(secondPosts).toBe(1)
  })

  it('protects its random loopback route, requires a key, closes active streams and is repeatably disposable', async () => {
    const live = await upstream((req, res) => {
      if (req.url === '/v1/models') res.end(models)
      else { res.writeHead(200, { 'Content-Type': 'text/event-stream' }); res.write('data: hello\n\n') }
    })
    const bridge = await gateway([live])
    expect((await fetch(`${bridge.baseURL}/models`)).status).toBe(401)
    expect((await fetch(new URL('/v1/models', bridge.baseURL), { headers: auth })).status).toBe(404)
    expect((await fetch(`${bridge.baseURL}/unknown`, { headers: auth })).status).toBe(404)
    const stream = await fetch(`${bridge.baseURL}/chat/completions`, { method: 'POST', headers: auth, body: '{}' })
    expect(stream.status).toBe(200)
    await bridge.close()
    await bridge.close()
    await expect(fetch(`${bridge.baseURL}/models`, { headers: auth })).rejects.toThrow()
    // Consume the terminated response so its abort is observed by the caller.
    await stream.text().catch(() => undefined)
  })

  it('routes GET /models to the matched 8600 catalog with the caller API key and parameters', async () => {
    const apiEndpoint = await upstream((req, res) => {
      if (req.url === '/v1/models') { res.end(models); return }
      res.writeHead(404); res.end()
    })
    const catalogEndpoint = await upstream((req, res) => {
      const key = req.headers.authorization
      res.setHeader('Content-Type', 'application/json')
      if (key === 'Bearer cpa_only_glm') {
        res.end(JSON.stringify({
          stats: { key_filtered: true },
          models: [
            { id: 'glm-5.3', configured: true, context: 1048576, max_output: 131072, input_modalities: ['text', 'image'] }
          ]
        }))
        return
      }
      res.end(JSON.stringify({
        stats: { key_filtered: true },
        models: [
          { id: 'gpt-6.1-sol', configured: true, context: 1050000, max_output: 128000, input_modalities: ['text', 'image'] }
        ]
      }))
    })
    const catalogURL = `${catalogEndpoint.replace(/\/v1$/, '')}/api/models`
    const bridge = await startRendCoreGateway({
      endpoints: [apiEndpoint],
      catalogEndpoints: { [apiEndpoint]: catalogURL },
      probeTimeoutMs: 150
    })
    cleanup.push(() => bridge.close())

    const r1 = await fetch(`${bridge.baseURL}/models`, { headers: { Authorization: 'Bearer cpa_only_glm' } })
    expect(r1.status).toBe(200)
    expect(await r1.json()).toEqual({
      object: 'list',
      data: [{
        id: 'glm-5.3',
        object: 'model',
        name: 'glm-5.3',
        contextWindow: 1048576,
        maxTokens: 131072,
        architecture: { input_modalities: ['text', 'image'] }
      }]
    })

    const r2 = await fetch(`${bridge.baseURL}/models`, { headers: { Authorization: 'Bearer cpa_only_sol' } })
    expect(r2.status).toBe(200)
    const j2 = await r2.json() as { data: Array<{ id: string }> }
    expect(j2.data.map(row => row.id)).toEqual(['gpt-6.1-sol'])
  })
})
