import { Config as PiAiConfig } from '@deepseek-ai/dsh-llm-pi-ai'
import { describe, expect, it } from 'vitest'
import { MAX_REQUEST_TOKENS, parseCapabilities } from '../src/main/runtime/rendcore-model-catalog'

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

  it('clamps max_tokens to the ceiling the gateway accepts', () => {
    // The gateway answers 400 "Field 'max_tokens' must be at most 65536" for
    // anything above its cap, even when the model's own ceiling is higher.
    const models = parseCapabilities({
      models: [
        { id: 'gpt-5.6-sol', configured: true, input: ['text'], max_output: 128000 },
        { id: 'glm-5.3', configured: true, input: ['text'], max_output: 943717 },
        { id: 'gemini-3.1-flash-image', configured: true, input: ['image'], max_output: 32768 }
      ]
    })

    expect(models.map((model) => model.maxTokens)).toEqual([
      MAX_REQUEST_TOKENS,
      MAX_REQUEST_TOKENS,
      32_768
    ])
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
