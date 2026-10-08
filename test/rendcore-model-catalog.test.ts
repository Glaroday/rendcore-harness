import { Config as PiAiConfig } from '@deepseek-ai/dsh-llm-pi-ai'
import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prepareRendCoreModelCatalog, parseCapabilities } from '../src/main/runtime/rendcore-model-catalog'

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
    // The service is a synced index and has gaps: a model the gateway serves
    // while the index states no modalities used to be declared text-only, which
    // disabled the attach button for a vision model.
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

describe('RendCore capability memory', () => {
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
    launch: (capabilities: unknown, gatewayIds: string[]) => Promise<{ id: string; input: string[] }[]>
    cleanup: () => Promise<void>
  }> {
    const root = await mkdtemp(join(tmpdir(), 'rc-catalog-'))
    const dshHome = join(root, 'harness')
    await mkdir(dshHome, { recursive: true })
    const basePatchPath = join(root, 'dsh-desktop.patch.yml')
    await writeFile(basePatchPath, basePatch, 'utf8')
    await writeFile(join(dshHome, '.credentials.yaml'), 'version: 1\nrefs:\n  RENDCORE_API_KEY: test-key\n', 'utf8')
    const realFetch = globalThis.fetch
    return {
      dshHome,
      launch: async (capabilities, gatewayIds) => {
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

  const gatewayIds = ['gpt-6-luna', 'glm-5.3', 'kimi-k3']
  const stated = {
    models: [
      { id: 'gpt-6-luna', configured: true, input_modalities: ['text', 'image', 'file'] },
      { id: 'glm-5.3', configured: true, input_modalities: ['text'] }
    ]
  }

  it('reuses the last stated modalities when the service goes silent', async () => {
    const { dshHome, launch, cleanup } = await fixture()
    try {
      expect(await launch(stated, gatewayIds)).toEqual([
        { id: 'gpt-6-luna', input: ['text', 'image'] },
        { id: 'glm-5.3', input: ['text'] },
        // The gateway serves it and the service states nothing: multimodal.
        { id: 'kimi-k3', input: ['text', 'image'] }
      ])

      // A later launch whose capability response lost those entries keeps them,
      // instead of re-deriving them from a guess.
      expect(await launch({ models: [] }, gatewayIds)).toEqual([
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
      await launch(stated, gatewayIds)
      // No gateway key and no capability service: the sanitized patch fallback
      // still carries the modalities the service stated earlier.
      await rm(join(dshHome, '.credentials.yaml'), { force: true })
      const models = await launch({ models: [] }, gatewayIds)
      expect(models).toEqual([
        { id: 'gpt-6-luna', input: ['text', 'image'] },
        { id: 'glm-5.3', input: ['text'] },
        { id: 'kimi-k3', input: ['text', 'image'] }
      ])
    } finally {
      await cleanup()
    }
  })
})