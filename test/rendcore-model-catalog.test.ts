import { Config as PiAiConfig } from '@deepseek-ai/dsh-llm-pi-ai'
import { describe, expect, it } from 'vitest'
import { parseCapabilities } from '../src/main/runtime/rendcore-model-catalog'

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
