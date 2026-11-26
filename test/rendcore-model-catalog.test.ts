import { Config as PiAiConfig } from '@deepseek-ai/dsh-llm-pi-ai'
import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RENDCORE_API_ENDPOINTS, RENDCORE_CATALOG_ENDPOINTS } from '../src/main/runtime/rendcore-gateway'
import { prepareRendCoreModelCatalog, refreshRendCoreModelCatalog, parseCapabilities } from '../src/main/runtime/rendcore-model-catalog'

describe('RendCore online model catalog', () => {
  it('normalizes gateway reasoning aliases to the Harness 0.1.2 schema', () => {
    const models = parseCapabilities({
      models: [
        {
          id: 'qwen3.7-plus',
          configured: true,
          input: ['text', 'image', 'video'],
          thinking: { low: 'low', high: 'high', none: 'none', future: 'future' }
        },
        {
          id: 'gemini-3-flash',
          configured: true,
          thinking: 'none'
        },
        {
          id: 'gemini-3.7-flash-high',
          configured: true,
          thinking: 'high'
        },
        {
          id: 'strict-null-values',
          configured: true,
          thinking: { off: null, high: null, max: 'max' }
        }
      ]
    })

    expect(models[0]).toMatchObject({
      input: ['text', 'image'],
      reasoningEfforts: { low: 'low', high: 'high', off: 'none' }
    })
    expect(models[1]?.reasoningEfforts).toBe(false)
    expect(models[2]?.reasoningEfforts).toEqual({ high: 'high' })
    expect(models[3]?.reasoningEfforts).toEqual({ off: null, max: 'max' })

    for (const model of models) {
      if (!model.reasoningEfforts) continue
      expect(Object.keys(model.reasoningEfforts).some((level) => level !== 'off')).toBe(true)
    }

    expect(() => PiAiConfig({
      providers: {
        rendcore: {
          api: 'openai-completions',
          baseURL: 'http://127.0.0.1/v1',
          models
        }
      }
    })).not.toThrow()
  })

  it('filters image-generation-only models before schema validation', () => {
    expect(parseCapabilities({
      models: [
        { id: 'gpt-image-2', configured: true, input: ['image'] },
        { id: 'gpt-5.6-sol', configured: true, input: ['text', 'image'] }
      ]
    }).map((model) => model.id)).toEqual(['gpt-5.6-sol'])
  })

  it('clamps misreported max_output near contextWindow while preserving normal output caps', () => {
    const models = parseCapabilities({
      models: [
        { id: 'glm-5.3', configured: true, context: 1048576, max_output: 943718, input: ['text', 'image'] },
        { id: 'gpt-6.1-sol', configured: true, context: 1050000, max_output: 128000, input: ['text', 'image'] },
        { id: 'glm-5.3-flash', configured: true, context: 1048576, max_output: 131072, input: ['text', 'image'] }
      ]
    })

    expect(models[0]?.maxTokens).toBe(262144)
    expect(models[1]?.maxTokens).toBe(128000)
    expect(models[2]?.maxTokens).toBe(131072)
  })
})

describe('RendCore capability modalities', () => {
  it('keeps text and image, drops the modalities the adapter cannot carry', () => {
    const models = parseCapabilities({
      models: [
        { id: 'grok-4.7', configured: true, input_modalities: ['text', 'image', 'file'] },
        { id: 'kimi-k3', configured: true, input_modalities: ['text', 'image', 'video'] },
        { id: 'glm-5.3', configured: true, input_modalities: ['text'] }
      ]
    })

    expect(models[0]?.input).toEqual(['text', 'image'])
    expect(models[1]?.input).toEqual(['text', 'image'])
    // An explicit text-only answer is an answer: it stays text-only.
    expect(models[2]?.input).toEqual(['text'])
    expect(models.map((model) => model.inputStated)).toEqual([true, true, true])
  })

  it('declares an unstated model multimodal instead of silently text-only', () => {
    const models = parseCapabilities({
      models: [
        { id: 'space-bunny', configured: true, input_modalities: [] },
        { id: 'no-modalities-key', configured: true }
      ]
    })

    expect(models.map((model) => model.input)).toEqual([
      ['text', 'image'],
      ['text', 'image']
    ])
    expect(models.map((model) => model.inputStated)).toEqual([false, false])
    expect(() => PiAiConfig({
      providers: {
        rendcore: {
          api: 'openai-completions',
          baseURL: 'http://127.0.0.1/v1',
          models
        }
      }
    })).not.toThrow()
  })
})

describe('RendCore keyed 8600 catalog and capability memory', () => {
  const basePatch = [
    '- id: llm-pi-ai',
    '  config:',
    '    providers:',
    '      rendcore:',
    '        api: openai-completions',
    '        baseURL: http://127.0.0.1/v1',
    '        defaultInput: [text]',
    '        models:',
    '          - id: "stale"',
    '            name: "stale"',
    '            input: ["text"]',
    '',
    '- id: compaction-basic',
    '  config:',
    '    summarizationProvider: rendcore',
    '    summarizationModel: gpt-5.6-sol',
    ''
  ].join('\n')

  /** One installation: the same dshHome is reused across launches, like a real one. */
  async function fixture(): Promise<{
    dshHome: string
    launch: (capabilities: unknown, gatewayIds?: string[]) => Promise<{ id: string; input: string[] }[]>
    cleanup: () => Promise<void>
  }> {
    const root = await mkdtemp(join(tmpdir(), 'rc-catalog-'))
    const dshHome = join(root, 'harness')
    await mkdir(dshHome, { recursive: true })
    const basePatchPath = join(root, 'dsh-desktop.patch.yml')
    await writeFile(basePatchPath, basePatch, 'utf8')
    await writeFile(join(dshHome, '.credentials.yaml'), 'version: 1\nrefs:\n  RENDCORE_API_KEY: cpa_test_key\n', 'utf8')
    const realFetch = globalThis.fetch
    return {
      dshHome,
      launch: async (capabilities, gatewayIds = []) => {
        globalThis.fetch = (async (url: string | URL) => {
          const payload = String(url).includes('/api/models')
            ? capabilities
            : { data: gatewayIds.map((id) => ({ id, object: 'model' })) }
          return { ok: true, json: async () => payload } as unknown as Response
        }) as typeof fetch
        try {
          const result = await prepareRendCoreModelCatalog(basePatchPath, dshHome, () => {})
          return result.models.map((model) => ({ id: model.id, input: [...model.input] }))
        } finally {
          globalThis.fetch = realFetch
        }
      },
      cleanup: async () => {
        globalThis.fetch = realFetch
        await rm(root, { recursive: true, force: true })
      }
    }
  }

  const stated = {
    models: [
      { id: 'gpt-6-luna', configured: true, input_modalities: ['text', 'image', 'file'] },
      { id: 'glm-5.3', configured: true, input_modalities: ['text'] },
      { id: 'kimi-k3', configured: true, input_modalities: ['text', 'image'] }
    ]
  }

  it('reuses the last stated modalities when a subsequent 8600 response omits them', async () => {
    const { dshHome, launch, cleanup } = await fixture()
    try {
      expect(await launch(stated)).toEqual([
        { id: 'gpt-6-luna', input: ['text', 'image'] },
        { id: 'glm-5.3', input: ['text'] },
        { id: 'kimi-k3', input: ['text', 'image'] }
      ])

      // A later launch whose 8600 response temporarily drops modalities keeps
      // the remembered answers instead of re-deriving them from a guess.
      expect(await launch({
        models: [
          { id: 'gpt-6-luna', configured: true },
          { id: 'glm-5.3', configured: true },
          { id: 'kimi-k3', configured: true }
        ]
      })).toEqual([
        { id: 'gpt-6-luna', input: ['text', 'image'] },
        { id: 'glm-5.3', input: ['text'] },
        { id: 'kimi-k3', input: ['text', 'image'] }
      ])

      // The remembered answers live beside the generated patch.
      const remembered = JSON.parse(await readFile(join(dshHome, 'rendcore-model-capabilities.json'), 'utf8'))
      expect(remembered.models['glm-5.3']).toMatchObject({ input: ['text'] })
      const generated = await readFile(join(dshHome, 'rendcore-online.patch.yml'), 'utf8')
      expect(generated).toContain('- id: "gpt-6-luna"')
      expect(generated).not.toContain('inputStated')
    } finally {
      await cleanup()
    }
  })

  it('serves the generated catalog from the remembered answers with no service at all', async () => {
    const { dshHome, launch, cleanup } = await fixture()
    try {
      await launch(stated)
      // No gateway key and no capability service: the sanitized patch fallback
      // still carries the modalities the service stated earlier.
      await rm(join(dshHome, '.credentials.yaml'), { force: true })
      const models = await launch({ models: [] })
      expect(models).toEqual([
        { id: 'gpt-6-luna', input: ['text', 'image'] },
        { id: 'glm-5.3', input: ['text'] },
        { id: 'kimi-k3', input: ['text', 'image'] }
      ])
    } finally {
      await cleanup()
    }
  })

  it('queries the matched :8600 endpoint with the stored API key and falls back across 8600 mirrors', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rc-catalog-8600-'))
    const dshHome = join(root, 'harness')
    await mkdir(dshHome, { recursive: true })
    const basePatchPath = join(root, 'dsh-desktop.patch.yml')
    await writeFile(basePatchPath, basePatch, 'utf8')
    await writeFile(join(dshHome, '.credentials.yaml'), 'version: 1\nrefs:\n  RENDCORE_API_KEY: cpa_scoped_key\n', 'utf8')
    const realFetch = globalThis.fetch
    const calls: Array<{ url: string; auth: string | null }> = []
    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers)
      const target = String(url)
      calls.push({ url: target, auth: headers.get('authorization') })
      if (target === RENDCORE_CATALOG_ENDPOINTS[1]) {
        return new Response(null, { status: 503 })
      }
      if (target === RENDCORE_CATALOG_ENDPOINTS[0]) {
        return Response.json({
          stats: { key_filtered: true },
          models: [
            { id: 'glm-5.3', configured: true, context: 1048576, max_output: 131072, input_modalities: ['text', 'image'], thinking: ['low', 'high'] }
          ]
        })
      }
      throw new Error(`unexpected fetch: ${target}`)
    }) as typeof fetch
    try {
      const result = await prepareRendCoreModelCatalog(basePatchPath, dshHome, () => {}, 'http://127.0.0.1:9999/v1', {
        preferredEndpoint: RENDCORE_API_ENDPOINTS[1]
      })
      // Preferred 47.103.24.134:18036 maps to 47.103.24.134:8600 first, then falls back to primary 8.138.248.191:8600.
      expect(calls).toEqual([
        { url: RENDCORE_CATALOG_ENDPOINTS[1], auth: 'Bearer cpa_scoped_key' },
        { url: RENDCORE_CATALOG_ENDPOINTS[0], auth: 'Bearer cpa_scoped_key' }
      ])
      expect(result.source).toBe('online')
      expect(result.models.map((m) => m.id)).toEqual(['glm-5.3'])
      expect(result.models[0]).toMatchObject({ contextWindow: 1048576, maxTokens: 131072, input: ['text', 'image'] })
    } finally {
      globalThis.fetch = realFetch
      await rm(root, { recursive: true, force: true })
    }
  })

  it('refreshRendCoreModelCatalog preserves the active gateway baseURL and uses the updated API key', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rc-refresh-'))
    const dshHome = join(root, 'harness')
    await mkdir(dshHome, { recursive: true })
    const basePatchPath = join(root, 'dsh-desktop.patch.yml')
    await writeFile(basePatchPath, basePatch, 'utf8')
    await writeFile(join(dshHome, 'rendcore-online.patch.yml'), basePatch.replace('http://127.0.0.1/v1', 'http://127.0.0.1:43210/rendcore-abc/v1'), 'utf8')
    await writeFile(join(dshHome, '.credentials.yaml'), 'version: 1\nrefs:\n  RENDCORE_API_KEY: cpa_new_key\n', 'utf8')
    const realFetch = globalThis.fetch
    let seenAuth: string | null = null
    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      seenAuth = new Headers(init?.headers).get('authorization')
      return Response.json({
        stats: { key_filtered: true },
        models: [
          { id: 'gpt-6.1-sol', configured: true, context: 1050000, max_output: 128000, input_modalities: ['text', 'image'] }
        ]
      })
    }) as typeof fetch
    try {
      const result = await refreshRendCoreModelCatalog(basePatchPath, dshHome, () => {})
      expect(seenAuth).toBe('Bearer cpa_new_key')
      expect(result).toEqual({
        ok: true,
        source: 'online',
        models: [
          { id: 'gpt-6.1-sol', name: 'gpt-6.1-sol', contextWindow: 1050000, maxTokens: 128000, input: ['text', 'image'] }
        ]
      })
      const rendered = await readFile(join(dshHome, 'rendcore-online.patch.yml'), 'utf8')
      expect(rendered).toContain('baseURL: http://127.0.0.1:43210/rendcore-abc/v1')
    } finally {
      globalThis.fetch = realFetch
      await rm(root, { recursive: true, force: true })
    }
  })

  it('updates agent-default-model in rendcore-online.patch.yml when gpt-6.1-sol is not in the key catalog', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rc-default-model-'))
    const dshHome = join(root, 'harness')
    await mkdir(dshHome, { recursive: true })
    const basePatchPath = join(root, 'dsh-desktop.patch.yml')
    await writeFile(basePatchPath, `${basePatch}\n- id: agent-default-model\n  config:\n    provider: rendcore\n    model: gpt-6.1-sol\n`, 'utf8')
    await writeFile(join(dshHome, '.credentials.yaml'), 'version: 1\nrefs:\n  RENDCORE_API_KEY: cpa_no_sol\n', 'utf8')
    const realFetch = globalThis.fetch
    globalThis.fetch = (async () => Response.json({
      stats: { key_filtered: true },
      models: [
        { id: 'glm-5.3-flash', configured: true, context: 1048576, max_output: 131072, input_modalities: ['text', 'image'] }
      ]
    })) as typeof fetch
    try {
      const result = await refreshRendCoreModelCatalog(basePatchPath, dshHome, () => {})
      expect(result.ok).toBe(true)
      const rendered = await readFile(join(dshHome, 'rendcore-online.patch.yml'), 'utf8')
      expect(rendered).toContain('model: glm-5.3-flash')
      expect(rendered).not.toContain('model: gpt-6.1-sol')
    } finally {
      globalThis.fetch = realFetch
      await rm(root, { recursive: true, force: true })
    }
  })
})
