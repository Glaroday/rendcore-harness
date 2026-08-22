import { readFile } from 'node:fs/promises'
import { getBuiltinModels } from '@earendil-works/pi-ai/providers/all'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

const PI_AI_ONBOARDING_PROVIDERS = [
  'openai',
  'anthropic',
  'google',
  'openrouter',
  'xai',
  'moonshotai-cn',
  'minimax-cn',
  'zai-coding-cn',
  'mistral',
  'groq',
  'together'
] as const

describe('desktop provider onboarding patch', () => {
  it.each(PI_AI_ONBOARDING_PROVIDERS)('%s has a bundled model catalog', (provider) => {
    expect(getBuiltinModels(provider).length).toBeGreaterThan(0)
  })

  it('is captured as a reproducible dependency patch', async () => {
    const [patch, installed] = await Promise.all([
      readFile(patchPath('@deepseek-ai/dsh-client-ui-settings-models'), 'utf8'),
      readFile('node_modules/@deepseek-ai/dsh-client-ui-settings-models/lib/client.js', 'utf8')
    ])
    expect(patch).toContain('ONBOARDING_PROVIDERS')
    expect(patch).toContain('{ provider: "rendcore", displayName: "RendCore"')
    expect(patch).toContain('useState)("rendcore")')
    expect(patch).toContain('row.entry.provider === "rendcore"')
    expect(patch).toContain('openrouter')
    expect(patch).toContain('接入模型提供方')
    expect(patch).toContain('dshProviderGrid')
    expect(patch).toContain('aria-pressed')
    expect(installed).toContain('className: "dshProviderCard"')
    expect(installed).toContain('providerPickerOpen')
    expect(installed).toContain('providerSearch: "搜索提供方"')
    expect(installed).toContain('.dshProviderCard[aria-pressed=true]{border-color:var(--dsw-alias-border-l1)')
    expect(installed).toContain('SETTINGS_PROVIDER_PRIORITY')
    const onboardingStart = installed.indexOf('const ONBOARDING_PROVIDERS')
    expect(onboardingStart).toBeGreaterThanOrEqual(0)
    expect(installed.indexOf('"rendcore"', onboardingStart)).toBeLessThan(
      installed.indexOf('"deepseek-official"', onboardingStart)
    )
    expect(installed.indexOf('"deepseek-official"', onboardingStart)).toBeLessThan(
      installed.indexOf('"openai"', onboardingStart)
    )
    expect(installed).toContain('left.entry.displayName.localeCompare(right.entry.displayName)')
  })
})
