import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { RENDCORE_API_ENDPOINTS } from '../src/main/runtime/rendcore-gateway'
import { RendCoreUpstreamSettings } from '../src/main/runtime/rendcore-upstream-settings'

const temporary: string[] = []
afterEach(async () => {
  vi.unstubAllGlobals()
  for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true })
})

async function home() {
  const path = await mkdtemp(join(tmpdir(), 'rendcore-upstreams-'))
  temporary.push(path)
  return path
}

it('persists only built-in upstream choices, resets to automatic, and never returns a key', async () => {
  const path = await home()
  const settings = new RendCoreUpstreamSettings(path, Promise.resolve(undefined))
  expect(settings.snapshot().preferred).toBeNull()
  expect(settings.snapshot().endpoints[0]?.url).toBe('http://8.138.248.191:18036/v1')
  await settings.save(RENDCORE_API_ENDPOINTS[2])
  await expect(settings.save('http://other.example/v1')).rejects.toThrow('Invalid RendCore upstream')
  const restarted = new RendCoreUpstreamSettings(path, Promise.resolve(undefined))
  await restarted.load()
  expect(restarted.preferredEndpoint).toBe(RENDCORE_API_ENDPOINTS[2])
  expect((await restarted.save(null)).preferred).toBeNull()
})

it('distinguishes reachable authentication, usable discovery and an unavailable upstream', async () => {
  const settings = new RendCoreUpstreamSettings(await home(), Promise.resolve(undefined))
  const probe = vi.fn(async (url: string) => {
    if (url.startsWith(RENDCORE_API_ENDPOINTS[0])) return new Response(null, { status: 401 })
    if (url.startsWith(RENDCORE_API_ENDPOINTS[1])) return Response.json({ data: [{ id: 'fixture' }] })
    throw new Error('offline')
  })
  vi.stubGlobal('fetch', probe)
  const snapshot = await settings.probe()
  expect(snapshot.endpoints.map(endpoint => endpoint.status)).toEqual(['auth-required', 'available', 'unavailable'])
  expect(probe.mock.calls.map(([url]) => url)).toEqual(RENDCORE_API_ENDPOINTS.map(url => `${url}/models`))
})
