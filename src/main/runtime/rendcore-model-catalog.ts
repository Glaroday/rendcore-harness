import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'

export const RENDCORE_MODELS_ENDPOINT = 'http://43.248.102.104:18704/v1/models'
export const RENDCORE_MODEL_CAPABILITIES_ENDPOINT = 'http://43.248.102.104:8600/api/models'
const SAFE_DEFAULT_MODEL = 'gpt-5.6-sol'

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
const DEFAULT_INPUT: Array<'text' | 'image'> = ['text', 'image']

/** Where the capabilities last stated by the service are remembered. */
const CAPABILITY_CACHE_FILE = 'rendcore-model-capabilities.json'

interface RememberedCapability {
  contextWindow?: number
  maxTokens?: number
  input?: Array<'text' | 'image'>
  reasoningEfforts?: false | Record<string, string | null>
}

interface CatalogResult {
  path: string
  models: RendCoreModel[]
  source: 'online' | 'capabilities' | 'cache' | 'bundled'
}

export async function prepareRendCoreModelCatalog(
  basePatchPath: string,
  dshHome: string,
  log: (line: string) => void
): Promise<CatalogResult> {
  const cachedPath = join(dshHome, 'rendcore-online.patch.yml')
  await sanitizeStoredModels(dshHome, log)
  const remembered = await readCapabilityCache(dshHome, log)
  const capabilities = await fetchJson(RENDCORE_MODEL_CAPABILITIES_ENDPOINT, undefined, 8_000)
    .then(parseCapabilities)
    .catch((error: unknown) => {
      log(`[desktop] RendCore capability discovery failed: ${message(error)}`)
      return []
    })
  const apiKey = await readStoredApiKey(dshHome)

  let models: RendCoreModel[] = []
  let source: CatalogResult['source'] = 'bundled'
  if (apiKey) {
    try {
      const payload = await fetchJson(
        RENDCORE_MODELS_ENDPOINT,
        { Authorization: `Bearer ${apiKey}` },
        15_000
      )
      models = mergeCatalogIds(parseModelIds(payload), capabilities)
      if (models.length === 0) throw new Error('the gateway returned no chat models')
      source = 'online'
    } catch (error) {
      log(`[desktop] RendCore model discovery failed: ${message(error)}`)
    }
  }
  if (models.length === 0 && capabilities.length > 0) {
    models = capabilities
    source = 'capabilities'
  }

  if (models.length > 0) {
    models = mergeRememberedCapabilities(models, remembered, false)
    const base = await readFile(basePatchPath, 'utf8')
    const rendered = replaceCatalog(base, models)
    await writeFile(cachedPath, rendered, 'utf8')
    await syncStoredModels(dshHome, models)
    await writeCapabilityCache(dshHome, models, remembered, log)
    await repairDefaultModel(dshHome, new Set(models.map((model) => model.id)))
    log(`[desktop] loaded ${models.length} RendCore models from ${source}`)
    return { path: cachedPath, models, source }
  }

  if (existsSync(cachedPath)) {
    try {
      const cached = await readFile(cachedPath, 'utf8')
      const cachedModels = mergeRememberedCapabilities(modelsFromPatch(parse(cached)), remembered, true)
      if (cachedModels.length > 0) {
        const base = await readFile(basePatchPath, 'utf8')
        await writeFile(cachedPath, replaceCatalog(base, cachedModels), 'utf8')
        await syncStoredModels(dshHome, cachedModels)
        await repairDefaultModel(dshHome, new Set(cachedModels.map((model) => model.id)))
        log(`[desktop] using sanitized cached RendCore model catalog (${cachedModels.length} models)`)
        return { path: cachedPath, models: cachedModels, source: 'cache' }
      }
    } catch (error) {
      log(`[desktop] cached RendCore catalog is invalid: ${message(error)}`)
    }
  }

  log('[desktop] using bundled RendCore model catalog')
  return { path: basePatchPath, models: [], source: 'bundled' }
}

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
    return [{
      id,
      name: stringValue(value.display_name ?? value.displayName ?? value.name) || id,
      contextWindow: positiveInteger(value.context ?? value.context_window ?? value.contextWindow),
      maxTokens: positiveInteger(value.max_output ?? value.max_tokens ?? value.maxTokens),
      input: input.value,
      inputStated: input.stated,
      reasoningEfforts: parseReasoning(value.thinking ?? value.reasoning_efforts ?? value.reasoningEfforts)
    }]
  }))
}

function modelsFromPatch(payload: unknown): RendCoreModel[] {
  if (!Array.isArray(payload)) return []
  for (const row of payload) {
    const entry = objectValue(row)
    if (entry?.id !== 'llm-pi-ai') continue
    const providers = objectValue(objectValue(entry.config)?.providers)
    const rendcore = objectValue(providers?.rendcore)
    return normalizeStoredModelList(rendcore?.models)
  }
  return []
}

function parseModelIds(payload: unknown): string[] {
  const data = payload && typeof payload === 'object'
    ? (payload as Record<string, unknown>).data
    : undefined
  if (!Array.isArray(data)) return []
  return data.flatMap((entry) => {
    const id = typeof entry === 'string'
      ? entry.trim()
      : entry && typeof entry === 'object'
        ? stringValue((entry as Record<string, unknown>).id)
        : ''
    return id && !isImageGenerationOnly(id, typeof entry === 'object' ? entry as Record<string, unknown> : undefined)
      ? [id]
      : []
  }).filter((id, index, all) => all.findIndex((item) => item.toLowerCase() === id.toLowerCase()) === index)
}

function mergeCatalogIds(ids: string[], capabilities: RendCoreModel[]): RendCoreModel[] {
  const indexed = new Map(capabilities.map((model) => [model.id.toLowerCase(), model]))
  return ids.map((id) => indexed.get(id.toLowerCase()) ?? fallbackModel(id))
}

function fallbackModel(id: string): RendCoreModel {
  const normalized = id.toLowerCase()
  const contextWindow = /gpt-oss/.test(normalized) ? 131_072
    : /gpt-5\.4-mini|gpt-5\.3-codex/.test(normalized) ? 400_000
      : /gemini/.test(normalized) ? 1_048_576
        : 1_000_000
  const maxTokens = /gemini/.test(normalized) ? 65_536 : 128_000
  const reasoningEfforts: Record<string, string | null> | undefined = /^gpt-5\.6-(sol|terra|luna)$/.test(normalized)
    ? { low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' }
    : /^gpt-5\.(4|5)$/.test(normalized)
      ? { low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh' }
      : undefined
  return { id, name: id, contextWindow, maxTokens, input: [...DEFAULT_INPUT], reasoningEfforts }
}

function replaceCatalog(source: string, models: RendCoreModel[]): string {
  const modelMarker = /(\n        models:\r?\n)[\s\S]*?(?=\r?\n\r?\n\S)/
  if (!modelMarker.test(source)) return source
  const rows = models.map((model) => [
    `          - id: ${JSON.stringify(model.id)}`,
    `            name: ${JSON.stringify(model.name)}`,
    ...(model.contextWindow ? [`            contextWindow: ${model.contextWindow}`] : []),
    ...(model.maxTokens ? [`            maxTokens: ${model.maxTokens}`] : []),
    `            input: ${JSON.stringify(model.input)}`,
    ...(model.reasoningEfforts === undefined ? [] : [
      `            reasoningEfforts: ${model.reasoningEfforts === false ? 'false' : JSON.stringify(model.reasoningEfforts)}`
    ])
  ].join('\n')).join('\n')
  const summaryModel = [...models].sort((a, b) =>
    (b.contextWindow ?? 0) - (a.contextWindow ?? 0) || (b.maxTokens ?? 0) - (a.maxTokens ?? 0)
  )[0]?.id ?? SAFE_DEFAULT_MODEL
  return source
    .replace(modelMarker, `$1${rows}`)
    .replace(
      /(summarizationProvider:\s*rendcore\r?\n\s+summarizationModel:\s*)[^\r\n]+/,
      `$1${summaryModel}`
    )
}

async function syncStoredModels(dshHome: string, models: RendCoreModel[]): Promise<void> {
  const settingsPath = join(dshHome, 'settings.yaml')
  if (!existsSync(settingsPath)) return
  const source = await readFile(settingsPath, 'utf8')
  const settings = parse(source) as Record<string, unknown> | null
  const llm = objectValue(settings?.['llm-pi-ai'])
  const providers = objectValue(llm?.providers)
  const rendcore = objectValue(providers?.rendcore)
  if (!rendcore || !Array.isArray(rendcore.models)) return
  rendcore.models = models.map((model) => publicModel(model))
  await writeFile(settingsPath, stringify(settings), 'utf8')
}

async function sanitizeStoredModels(dshHome: string, log: (line: string) => void): Promise<void> {
  const settingsPath = join(dshHome, 'settings.yaml')
  if (!existsSync(settingsPath)) return
  try {
    const source = await readFile(settingsPath, 'utf8')
    const settings = parse(source) as Record<string, unknown> | null
    const providers = objectValue(objectValue(settings?.['llm-pi-ai'])?.providers)
    const rendcore = objectValue(providers?.rendcore)
    if (!rendcore || !Array.isArray(rendcore.models)) return
    const models = normalizeStoredModelList(rendcore.models)
    if (models.length === 0) return
    rendcore.models = models
    await writeFile(settingsPath, stringify(settings), 'utf8')
  } catch (error) {
    log(`[desktop] could not sanitize stored RendCore models: ${message(error)}`)
  }
}

function normalizeStoredModelList(value: unknown): RendCoreModel[] {
  if (!Array.isArray(value)) return []
  return unique(value.flatMap((entry) => {
    const model = objectValue(entry)
    const id = stringValue(model?.id)
    if (!model || !id || isImageGenerationOnly(id, model)) return []
    return [{
      id,
      name: stringValue(model.name) || id,
      contextWindow: positiveInteger(model.contextWindow ?? model.context_window ?? model.context),
      maxTokens: positiveInteger(model.maxTokens ?? model.max_tokens ?? model.max_output),
      input: resolveInput(arrayOfStrings(model.input), model).value,
      reasoningEfforts: parseReasoning(model.reasoningEfforts ?? model.reasoning_efforts ?? model.thinking)
    }]
  }))
}

async function repairDefaultModel(dshHome: string, available: Set<string>): Promise<void> {
  const settingsPath = join(dshHome, 'settings.yaml')
  if (!existsSync(settingsPath)) return
  const source = await readFile(settingsPath, 'utf8')
  const settings = parse(source) as Record<string, unknown> | null
  const selected = objectValue(settings?.['agent-default-model'])
  if (selected?.provider !== 'rendcore' || typeof selected.model !== 'string' || available.has(selected.model)) return
  selected.model = available.has(SAFE_DEFAULT_MODEL) ? SAFE_DEFAULT_MODEL : [...available][0]
  await writeFile(settingsPath, stringify(settings), 'utf8')
}

async function readStoredApiKey(dshHome: string): Promise<string | undefined> {
  try {
    const credentials = parse(await readFile(join(dshHome, '.credentials.yaml'), 'utf8')) as unknown
    const root = objectValue(credentials)
    const refs = objectValue(root?.refs) ?? root
    return stringValue(refs?.RENDCORE_API_KEY) || undefined
  } catch {
    return undefined
  }
}

async function fetchJson(url: string, headers: Record<string, string> | undefined, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { headers, signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}

function parseReasoning(value: unknown): false | Record<string, string | null> | undefined {
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
      // Prefer a canonical key if the endpoint supplies both `off` and an
      // alias such as `none`.
      if (!(key in efforts) || rawKey.trim().toLowerCase() === key) efforts[key] = wireValue
    }
  }
  const levels = Object.keys(efforts)
  if (levels.length === 0) return undefined
  // PiAi treats a catalog with only `off` as semantically invalid. The
  // capability service uses `none` for models that do not expose reasoning.
  return levels.some((level) => level !== 'off') ? efforts : false
}

/** The public fields of one model, in the shape both writers expect. */
function publicModel(model: RendCoreModel): RendCoreModel {
  return {
    id: model.id,
    name: model.name,
    ...(model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }),
    ...(model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens }),
    input: [...model.input],
    ...(model.reasoningEfforts === undefined ? {} : { reasoningEfforts: model.reasoningEfforts })
  }
}

/**
 * The modalities a list states, or undefined when it states none.
 *
 * Only text and image survive: the adapter's MODALITIES is exactly those two, so
 * a `file`, `video` or `audio` from the capability service would fail the
 * provider config at boot instead of widening what a request may carry.
 */
function statedInput(values: string[]): Array<'text' | 'image'> | undefined {
  const normalized = values
    .map((value) => value.toLowerCase())
    .filter((value): value is 'text' | 'image' => value === 'text' || value === 'image')
  if (normalized.length === 0) return undefined
  // Only two modalities exist, so any statement of them is the same claim in a
  // canonical order; the service's own field order would otherwise churn the
  // generated patch.
  return ['text', 'image']
}

/**
 * What one model accepts, and whether that was stated rather than assumed.
 *
 * Nothing interrogates a gateway for what it accepts (see the adapter's own
 * `input` documentation): declaring images is what makes a vision model usable,
 * while declaring text alone silently disables the attach button for a model
 * that does accept them. The capability service answers for most models, but it
 * is a synced index with gaps — a model the gateway serves while the index has
 * no modalities for it was declared text-only, which is the bug this default
 * fixes. An unknown model is therefore declared multimodal; a model that
 * genuinely refuses images is refused by the provider mid-turn, which is the
 * documented trade of a claim about the endpoint over a guess in the other
 * direction.
 */
function resolveInput(
  values: string[],
  model: Record<string, unknown>
): { value: Array<'text' | 'image'>; stated: boolean } {
  const stated = statedInput(values)
  if (stated !== undefined) return { value: stated, stated: true }
  if (model.supports_vision === true || model.supportsVision === true) return { value: [...DEFAULT_INPUT], stated: true }
  return { value: [...DEFAULT_INPUT], stated: false }
}

/**
 * Fill in what the capability service did not state from the last answer it did.
 *
 * The service is a synced index: a model can be served by the gateway while the
 * index temporarily has no modalities for it, and re-deriving from a guess every
 * launch is what made a model's capabilities flicker. A remembered answer is
 * used when the service is silent (or, for the sanitized patch fallback, always,
 * since that file is a previous run's output rather than a fresh answer).
 */
function mergeRememberedCapabilities(
  models: RendCoreModel[],
  remembered: Map<string, RememberedCapability>,
  preferRemembered: boolean
): RendCoreModel[] {
  if (remembered.size === 0) return models
  return models.map((model) => {
    const known = remembered.get(model.id.toLowerCase())
    if (known === undefined) return model
    const useInput = known.input !== undefined && (preferRemembered || model.inputStated !== true)
    return {
      ...model,
      contextWindow: model.contextWindow ?? known.contextWindow,
      maxTokens: model.maxTokens ?? known.maxTokens,
      input: useInput ? [...known.input!] : model.input,
      inputStated: model.inputStated === true || useInput,
      reasoningEfforts: model.reasoningEfforts ?? known.reasoningEfforts
    }
  })
}

async function readCapabilityCache(
  dshHome: string,
  log: (line: string) => void
): Promise<Map<string, RememberedCapability>> {
  const remembered = new Map<string, RememberedCapability>()
  const path = join(dshHome, CAPABILITY_CACHE_FILE)
  if (!existsSync(path)) return remembered
  try {
    const payload = JSON.parse(await readFile(path, 'utf8')) as { models?: unknown }
    const entries = objectValue(payload.models)
    if (entries === undefined) return remembered
    for (const [id, raw] of Object.entries(entries)) {
      const entry = objectValue(raw)
      if (entry === undefined) continue
      const input = statedInput(arrayOfStrings(entry.input))
      remembered.set(id.toLowerCase(), {
        contextWindow: positiveInteger(entry.contextWindow),
        maxTokens: positiveInteger(entry.maxTokens),
        ...(input === undefined ? {} : { input }),
        reasoningEfforts: parseReasoning(entry.reasoningEfforts)
      })
    }
  } catch (error) {
    log(`[desktop] remembered RendCore capabilities are unreadable: ${message(error)}`)
  }
  return remembered
}

async function writeCapabilityCache(
  dshHome: string,
  models: RendCoreModel[],
  remembered: Map<string, RememberedCapability>,
  log: (line: string) => void
): Promise<void> {
  try {
    const entries: Record<string, RememberedCapability> = {}
    for (const [id, entry] of remembered) entries[id] = entry
    for (const model of models) {
      if (model.inputStated !== true) continue
      entries[model.id.toLowerCase()] = {
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
        input: [...model.input],
        reasoningEfforts: model.reasoningEfforts
      }
    }
    await writeFile(join(dshHome, CAPABILITY_CACHE_FILE), `${JSON.stringify({ version: 1, models: entries }, undefined, 2)}\n`, 'utf8')
  } catch (error) {
    log(`[desktop] could not remember RendCore capabilities: ${message(error)}`)
  }
}

function isImageGenerationOnly(id: string, value?: Record<string, unknown>): boolean {
  if (/^(gpt-image|dall-e|imagen|flux|stable-diffusion|sdxl|midjourney)(?:[-_.]|$)/i.test(id)) return true
  const task = stringValue(value?.task ?? value?.type ?? value?.capability)
  return /image[-_ ]?generation|text[-_ ]?to[-_ ]?image/i.test(task)
}

function unique(models: RendCoreModel[]): RendCoreModel[] {
  return models.filter((model, index, all) => all.findIndex((item) => item.id.toLowerCase() === model.id.toLowerCase()) === index)
}
function positiveInteger(value: unknown): number | undefined { return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined }
function stringValue(value: unknown): string { return typeof value === 'string' ? value.trim() : '' }
function arrayOfStrings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [] }
function objectValue(value: unknown): Record<string, any> | undefined { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : undefined }
function message(error: unknown): string { return error instanceof Error ? error.message : String(error) }
