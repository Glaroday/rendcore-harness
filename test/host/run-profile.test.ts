import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { ensureSafeModeProfile, SAFE_MODE_PROFILE } from '../../src/main/recovery/safe-mode-profile'
import { DesktopHostProcess } from '../../src/main/shell/backend/host-process'
import { writeDesktopProductPatch } from '../../src/main/shell/product-patch'
import { ensureHostBundle, hostBundle } from './host-bundle-helper'

const require = createRequire(import.meta.url)
const electron = require('electron') as string
const root = resolve(import.meta.dirname, '../..')
const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

it('boots runProfile on a temporary home and redirects the authenticated document', async () => {
  await ensureHostBundle()
  const home = await mkdtemp(join(tmpdir(), 'dsh-shell-profile-'))
  temporary.push(home)
  const profile = join(home, 'profiles', 'desktop')
  await mkdir(profile, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({
    name: 'dsh-profile-desktop',
    private: true,
    dependencies: {},
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
  }))
  await writeFile(join(profile, 'cordis.yml'), '[]\n')
  await writeFile(join(profile, 'cordis.patch.yml'), '[]\n')
  const host = new DesktopHostProcess({
    node: electron,
    entry: hostBundle,
    runtimeDir: root,
    projectDir: profile,
    dshHome: home,
    profile: 'desktop',
    environment: { DSH_DESKTOP_PATCH_FILE: await writeDesktopProductPatch(home) },
    primaryRuntime: join(home, 'unused-runtime')
  })
  try {
    const ready = await host.start()
    const url = new URL(ready.url)
    expect(url.protocol).toBe('http:')
    expect(url.hostname).toBe('127.0.0.1')
    expect(url.port).not.toBe('')
    const response = await fetch(ready.url, { redirect: 'manual' })
    expect(response.status).toBe(303)
    expect(response.headers.has('set-cookie')).toBe(true)
    const injections = JSON.stringify(ready.injections)
    expect(injections).toContain('dsh-desktop-office')
    expect(injections).toContain('dsh-ppt-composer')
  } finally {
    await host.stop()
  }
}, 120_000)

it('boots safe mode without creating the shared profile modules directory', async () => {
  await ensureHostBundle()
  const home = await mkdtemp(join(tmpdir(), 'dsh-shell-safe-'))
  temporary.push(home)
  const profile = await ensureSafeModeProfile(home, 'desktop')
  const host = new DesktopHostProcess({
    node: electron,
    entry: hostBundle,
    runtimeDir: root,
    projectDir: profile,
    dshHome: home,
    profile: SAFE_MODE_PROFILE,
    environment: { DSH_DESKTOP_PATCH_FILE: await writeDesktopProductPatch(home, 'safe') },
    primaryRuntime: join(home, 'unused-runtime')
  })
  try {
    const ready = await host.start()
    expect(new URL(ready.url).hostname).toBe('127.0.0.1')
    const manifest: unknown = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(manifest).toMatchObject({ dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } } })
    await expect(lstat(join(home, 'profiles', 'node_modules'))).rejects.toMatchObject({ code: 'ENOENT' })
    const injections = JSON.stringify(ready.injections)
    expect(injections).not.toContain('dsh-desktop-office')
    expect(injections).not.toContain('dsh-ppt-composer')
  } finally {
    await host.stop()
  }
}, 120_000)

it('hot-reloads DSH_DESKTOP_PATCH_FILE overlay even when cordis.patch.yml has stale llm-pi-ai and agent-default-model entries', async () => {
  await ensureHostBundle()
  const home = await mkdtemp(join(tmpdir(), 'dsh-shell-overlay-reload-'))
  temporary.push(home)
  const profile = join(home, 'profiles', 'desktop')
  await mkdir(profile, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({
    name: 'dsh-profile-desktop',
    private: true,
    dependencies: {},
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
  }))
  await writeFile(join(profile, 'cordis.yml'), '[]\n')
  await writeFile(join(profile, 'cordis.patch.yml'), [
    '- id: agent-default-model',
    '  name: "@deepseek-ai/dsh-agent-default-model"',
    '  config:',
    '    provider: rendcore',
    '    model: stale-old-model',
    '- id: llm-pi-ai',
    '  name: "@deepseek-ai/dsh-llm-pi-ai"',
    '  config:',
    '    providers:',
    '      rendcore:',
    '        displayName: RendCore',
    '        apiKeyEnv: RENDCORE_API_KEY',
    '        api: openai-completions',
    '        baseURL: http://127.0.0.1:18036/v1',
    '        models:',
    '          - id: stale-old-model',
    '            name: stale-old-model',
    '            contextWindow: 128000',
    '            maxTokens: 16384',
    '            input: [text]',
    ''
  ].join('\n'))

  const baseOverlayPath = await writeDesktopProductPatch(home)
  const baseOverlay = await readFile(baseOverlayPath, 'utf8')
  const dynamicOverlayPath = join(home, 'rendcore-online.patch.yml')
  const makeOverlay = (modelsYaml: string, defaultModel: string) => baseOverlay
    .replace(/(\n        models:\r?\n)[\s\S]*?(?=\r?\n\r?\n\S)/, `$1${modelsYaml}`)
    .replace(/(id:\s*agent-default-model\r?\n[\s\S]*?provider:\s*rendcore\r?\n\s+model:\s*)[^\r\n]+/, `$1${defaultModel}`)

  await writeFile(dynamicOverlayPath, makeOverlay([
    '          - id: "model-alpha"',
    '            name: "model-alpha"',
    '            contextWindow: 1000000',
    '            maxTokens: 65536',
    '            input: ["text","image"]'
  ].join('\n'), 'model-alpha'), 'utf8')

  const host = new DesktopHostProcess({
    node: electron,
    entry: hostBundle,
    runtimeDir: root,
    projectDir: profile,
    dshHome: home,
    profile: 'desktop',
    environment: { DSH_DESKTOP_PATCH_FILE: dynamicOverlayPath },
    primaryRuntime: join(home, 'unused-runtime')
  })
  try {
    const ready = await host.start()
    expect(new URL(ready.url).hostname).toBe('127.0.0.1')

    await writeFile(dynamicOverlayPath, makeOverlay([
      '          - id: "model-beta"',
      '            name: "model-beta"',
      '            contextWindow: 1048576',
      '            maxTokens: 65536',
      '            input: ["text","image"]',
      '            reasoningEfforts: {"low":"low","high":"high"}',
      '          - id: "model-gamma"',
      '            name: "model-gamma"',
      '            contextWindow: 500000',
      '            maxTokens: 65536',
      '            input: ["text"]'
    ].join('\n'), 'model-beta'), 'utf8')

    await expect(host.reloadOverlay()).resolves.toEqual({ changed: true })
    await expect(host.reloadOverlay()).resolves.toEqual({ changed: false })

    const response = await fetch(ready.url, { redirect: 'manual' })
    expect(response.status).toBe(303)
  } finally {
    await host.stop()
  }
}, 120_000)