/** Shared parser and OpenAI-listing adapter for RendCore's :8600/api/models catalog. */

export interface RendCoreModel {
  id: string
  name: string
  contextWindow?: number
  maxTokens?: number
  input: Array<'text' | 'image'>
  reasoningEfforts?: false | Record<string, string | null>
  /**
   * Whether `input` came from the capability service rather than from the
   * permissive default. Internal: never written to the patch or to settings,
   * and only entries that stated modalities are remembered in the cache.
   */
  inputStated?: boolean
}

/** The only modalities the pi-ai adapter accepts (MODALITIES in dsh-llm-pi-ai). */
export const DEFAULT_INPUT: Array<'text' | 'image'> = ['text', 'image']

export function parseCapabilities(payload: unknown): RendCoreModel[] {
  const entries = payload && typeof payload === 'object'
    ? (payload as Record<string, unknown>).models
    : undefined
  if (!Array.isArray(entries)) return []
  return unique(entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const value = entry as Record<string, unknown>
    if (value.configured === false) return []
    const id = stringValue(value.id)
    if (!id || isImageGenerationOnly(id, value)) return []
    const modalities = arrayOfStrings(
      value.input ?? value.modalities ?? value.input_modalities ?? value.supported_modalities
    )
    const input = resolveInput(modalities, value)
    const contextWindow = positiveInteger(value.context ?? value.context_window ?? value.contextWindow)
    const maxTokens = clampMaxTokens(
      positiveInteger(value.max_output ?? value.max_tokens ?? value.maxTokens),
      contextWindow
    )
    return [{
      id,
      name: stringValue(value.display_name ?? value.displayName ?? value.name) || id,
      contextWindow,
      maxTokens,
      input: input.value,
      inputStated: input.stated,
      reasoningEfforts: parseReasoning(value.thinking ?? value.reasoning_efforts ?? value.reasoningEfforts)
    }]
  }))
}

export function isKeyFilteredCatalog(payload: unknown): boolean {
  const stats = objectValue(objectValue(payload)?.stats)
  return stats?.key_filtered === true
}

export function toOpenAIModelList(models: RendCoreModel[]): {
  object: 'list'
  data: Array<{
    id: string
    object: 'model'
    name: string
    contextWindow?: number
    maxTokens?: number
    architecture: { input_modalities: Array<'text' | 'image'> }
  }>
} {
  return {
    object: 'list',
    data: models.map((model) => ({
      id: model.id,
      object: 'model',
      name: model.name,
      ...(model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }),
      ...(model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens }),
      architecture: { input_modalities: [...model.input] }
    }))
  }
}

export function clampMaxTokens(maxTokens: number | undefined, contextWindow: number | undefined): number | undefined {
  if (maxTokens === undefined) return undefined
  // Guard against misreported output ceilings near the context window, which
  // starve compaction-basic's (contextWindow - maxTokens - headroom) threshold.
  if (contextWindow !== undefined && maxTokens > Math.floor(contextWindow * 0.5)) {
    return Math.max(1, Math.floor(contextWindow * 0.25))
  }
  return maxTokens
}

export function parseReasoning(value: unknown): false | Record<string, string | null> | undefined {
  if (value === false) return false
  const allowed = new Set(['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'])
  const normalizeKey = (raw: string): string => {
    const key = raw.trim().toLowerCase()
    return ['none', 'disabled', 'false'].includes(key) ? 'off' : key
  }
  const efforts: Record<string, string | null> = {}
  if (typeof value === 'string' || Array.isArray(value)) {
    for (const item of typeof value === 'string' ? [value] : value) {
      if (typeof item !== 'string') continue
      const key = normalizeKey(item)
      if (!allowed.has(key)) continue
      efforts[key] = item.trim()
    }
  }
  if (value && typeof value === 'object') {
    for (const [rawKey, rawWireValue] of Object.entries(value as Record<string, unknown>)) {
      const key = normalizeKey(rawKey)
      if (!allowed.has(key)) continue
      const wireValue = typeof rawWireValue === 'string' && rawWireValue.trim()
        ? rawWireValue.trim()
        : key === 'off' && (rawWireValue === null || rawWireValue === false || rawWireValue === '')
          ? null
          : undefined
      if (wireValue === undefined) continue
      if (!(key in efforts) || rawKey.trim().toLowerCase() === key) efforts[key] = wireValue
    }
  }
  const levels = Object.keys(efforts)
  if (levels.length === 0) return undefined
  return levels.some((level) => level !== 'off') ? efforts : false
}

export function statedInput(values: string[]): Array<'text' | 'image'> | undefined {
  const normalized = values
    .map((value) => value.toLowerCase())
    .filter((value): value is 'text' | 'image' => value === 'text' || value === 'image')
  if (normalized.length === 0) return undefined
  return normalized.includes('image') ? ['text', 'image'] : ['text']
}

export function resolveInput(
  values: string[],
  model: Record<string, unknown>
): { value: Array<'text' | 'image'>; stated: boolean } {
  const stated = statedInput(values)
  if (stated !== undefined) return { value: stated, stated: true }
  if (model.supports_vision === true || model.supportsVision === true) return { value: [...DEFAULT_INPUT], stated: true }
  return { value: [...DEFAULT_INPUT], stated: false }
}

export function isImageGenerationOnly(id: string, value?: Record<string, unknown>): boolean {
  if (/^(gpt-image|dall-e|imagen|flux|stable-diffusion|sdxl|midjourney)(?:[-_.]|$)/i.test(id)) return true
  const task = stringValue(value?.task ?? value?.type ?? value?.capability)
  return /image[-_ ]?generation|text[-_ ]?to[-_ ]?image/i.test(task)
}

export function unique(models: RendCoreModel[]): RendCoreModel[] {
  return models.filter((model, index, all) => all.findIndex((item) => item.id.toLowerCase() === model.id.toLowerCase()) === index)
}
export function positiveInteger(value: unknown): number | undefined { return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined }
export function stringValue(value: unknown): string { return typeof value === 'string' ? value.trim() : '' }
export function arrayOfStrings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [] }
export function objectValue(value: unknown): Record<string, any> | undefined { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : undefined }
