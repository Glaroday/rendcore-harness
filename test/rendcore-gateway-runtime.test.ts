import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { expect, it, vi } from 'vitest'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import * as gateways from '../src/main/runtime/rendcore-gateway'
import { resolveTestNodeExecutable } from './node-executable'

it('boots the ordinary Harness with an old saved endpoint, calls the new bridge, then releases it on stop', async () => {
  const home = await mkdtemp(join(tmpdir(), 'rc-gateway-runtime-'))
  const realFetch = globalThis.fetch
  const originalGateway = gateways.startRendCoreGateway
  const remote = createServer((req, res) => {
    expect(req.headers.authorization).toBe('Bearer fixture-key')
    res.setHeader('Content-Type', 'application/json')
    res.end(req.url === '/v1/models' ? '{"data":[{"id":"gpt-6.1-sol"}]}' : '{"ok":true}')
  })
  await new Promise<void>(resolve => remote.listen(0, '127.0.0.1', resolve))
  const address = remote.address()
  if (!address || typeof address === 'string') throw new Error('missing fixture address')
  let bridgeURL = ''
  const spy = vi.spyOn(gateways, 'startRendCoreGateway').mockImplementation(async () => {
    const bridge = await originalGateway({ endpoints: [`http://127.0.0.1:${address.port}/v1`] })
    bridgeURL = bridge.baseURL
    return bridge
  })
  globalThis.fetch = (input, init) => String(input) === gateways.RENDCORE_CAPABILITIES_ENDPOINT
    ? Promise.resolve(new Response(JSON.stringify({ models: [{ id: 'gpt-6.1-sol', context: 65536, max_output: 4096, input: ['text', 'image'], thinking: false }] })))
    : realFetch(input, init)
  const runtime = new HarnessRuntime({
    dshEntryPath: resolve('node_modules/@deepseek-ai/dsh/lib/bin.js'),
    nodeEntryPath: resolve('build/harness-node-entry.mjs'), nodeExecutablePath: resolveTestNodeExecutable(),
    dshPatchPath: resolve('build/dsh-desktop.patch.yml'), dshSafePatchPath: resolve('build/dsh-desktop-safe.patch.yml'),
    dshHome: home, logPath: join(home, 'runtime.log'), startupTimeoutMs: 45_000, preferredPort: 0,
    launchProcess: (executable, args, options) => spawn(executable, args, options), onChanged() {}
  })
  try {
    const profile = join(home, 'profiles/web')
    await mkdir(profile, { recursive: true })
    await symlink(resolve('node_modules'), join(home, 'profiles/node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
    await writeFile(join(profile, 'package.json'), JSON.stringify({ name: 'rc-routing-fixture', private: true, dependencies: {},
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } } }))
    await writeFile(join(profile, 'cordis.patch.yml'), '- id: llm-pi-ai\n  config:\n    providers:\n      rendcore:\n        baseURL: http://43.248.102.104:18704/v1\n')
    await writeFile(join(home, '.credentials.yaml'), 'version: 1\nrefs:\n  RENDCORE_API_KEY: fixture-key\n')
    for (let attempt = 0; attempt < 3; attempt++) {
      await runtime.start(home)
      expect(runtime.snapshot().phase, runtime.snapshot().logs.slice(-60).join('\n')).toBe('ready')
      const rendered = await readFile(join(home, 'rendcore-online.patch.yml'), 'utf8')
      expect(rendered).toContain(`baseURL: ${bridgeURL}`)
      expect(rendered).toContain('contextWindow: 65536')
      expect(rendered).toContain('input: ["text","image"]')
      expect(rendered).not.toContain('fixture-key')
      expect(await readFile(join(profile, 'cordis.patch.yml'), 'utf8')).not.toContain('43.248.102.104')
      const response = await fetch(`${bridgeURL}/chat/completions`, { method: 'POST', headers: { Authorization: 'Bearer fixture-key' }, body: '{}' })
      expect(await response.json()).toEqual({ ok: true })
      await runtime.stop()
      await expect(fetch(`${bridgeURL}/models`, { headers: { Authorization: 'Bearer fixture-key' } })).rejects.toThrow()
    }
  } finally {
    await runtime.stop()
    globalThis.fetch = realFetch
    spy.mockRestore()
    await new Promise<void>(resolve => { remote.close(() => resolve()); remote.closeAllConnections() })
    await rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}, 120_000)
