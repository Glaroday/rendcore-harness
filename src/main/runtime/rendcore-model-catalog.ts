import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import type { RendCoreModelRefreshResult } from '../../shared/rendcore-upstreams'
import {
  orderedRendCoreCatalogEndpoints,
  RENDCORE_API_ENDPOINTS,
  RENDCORE_CAPABILITIES_ENDPOINT
} from './rendcore-gateway'
import {
  arrayOfStrings,
  clampMaxTokens,
  DEFAULT_INPUT,
  isImageGenerationOnly,
  isKeyFilteredCatalog,
  objectValue,
  parseCapabilities,
  parseReasoning,
  positiveInteger,
  resolveInput,
  statedInput,
  stringValue,
  unique,
  type RendCoreModel
} from './rendcore-capabilities'

export { parseCapabilities, type RendCoreModel }

export const RENDCORE_MODELS_ENDPOINT = `${RENDCORE_API_ENDPOINTS[0]}/models`
export const RENDCORE_MODEL_CAPABILITIES_ENDPOINT = RENDCORE_CAPABILITIES_ENDPOINT
const SAFE_DEFAULT_MODEL = 'gpt-6.1-sol'

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

export interface PrepareCatalogOptions {
  preferredEndpoint?: string
  catalogEndpoints?: readonly string[]
  fallbackApiKey?: string
  baseURL?: string
}

async function fetchFromCatalogEndpoints(
  catalogEndpoints: readonly string[],
  apiKey: string | undefined,
  log: (line: string) => void
): Promise<{
  models: RendCoreModel[]
  source?: 'online' | 'capabilities'
  keyFilteredEmpty: boolean
  rejectedStatus?: number
  lastError?: string
}> {
  const catalogHeaders = apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined
  let lastError: string | undefined
  for (const catalogURL of catalogEndpoints) {
    const result = await fetchCatalog(catalogURL, catalogHeaders, 8_000)
    if (!result.ok) {
      lastError = result.error
      log(`[desktop] RendCore capability discovery failed (${catalogURL}): ${result.error}`)
      if (result.status === 401 || result.status === 403) {
        return { models: [], keyFilteredEmpty: false, rejectedStatus: result.status, lastError: result.error }
      }
      continue
    }
    const parsed = parseCapabilities(result.payload)
    if (parsed.length > 0) {
      return {
        models: parsed,
        source: apiKey ? 'online' : 'capabilities',
        keyFilteredEmpty: false
      }
    }
    if (isKeyFilteredCatalog(result.payload)) {
      log(`[desktop] RendCore catalog (${catalogURL}) returned 0 available chat models for this key`)
      return { models: [], keyFilteredEmpty: true }
    }
  }
  return { models: [], keyFilteredEmpty: false, lastError }
}

export async function refreshRendCoreModelCatalog(
  basePatchPath: string,
  dshHome: string,
  log: (line: string) => void,
  options: PrepareCatalogOptions = {}
): Promise<RendCoreModelRefreshResult> {
  const cachedPath = join(dshHome, 'rendcore-online.patch.yml')
  const remembered = await readCapabilityCache(dshHome, log)
  const apiKey = (await readStoredApiKey(dshHome)) || stringValue(options.fallbackApiKey) || undefined
  const catalogEndpoints = options.catalogEndpoints ?? orderedRendCoreCatalogEndpoints(options.preferredEndpoint)
  const discovery = await fetchFromCatalogEndpoints(catalogEndpoints, apiKey, log)

  if (discovery.rejectedStatus !== undefined) {
    return { ok: false, models: [], error: `API key rejected (HTTP ${discovery.rejectedStatus})` }
  }
  if (discovery.keyFilteredEmpty) {
    return { ok: false, models: [], error: 'This API key has no available chat models.' }
  }
  if (discovery.models.length === 0) {
    return { ok: false, models: [], error: discovery.lastError ?? 'RendCore catalog endpoints are unavailable.' }
  }

  const models = mergeRememberedCapabilities(discovery.models, remembered, false)
  const effectiveBaseURL = options.baseURL ?? await readActiveBaseURL(cachedPath) ?? RENDCORE_API_ENDPOINTS[0]
  const base = await readFile(basePatchPath, 'utf8')
  const rendered = replaceCatalog(replaceBaseURL(base, effectiveBaseURL), models)
  await writeManagedText(cachedPath, rendered)
  await writeCapabilityCache(dshHome, models, remembered, log)
  await repairDefaultModel(dshHome, new Set(models.map((model) => model.id)))
  const source = discovery.source ?? 'online'
  log(`[desktop] refreshed ${models.length} RendCore models from ${source}`)
  return { ok: true, models: models.map((model) => publicModel(model)), source }
}

export async function prepareRendCoreModelCatalog(
  basePatchPath: string,
  dshHome: string,
  log: (line: string) => void,
  baseURL: string = RENDCORE_API_ENDPOINTS[0],
  options: PrepareCatalogOptions = {}
): Promise<CatalogResult> {
  const cachedPath = join(dshHome, 'rendcore-online.patch.yml')
  await sanitizeStoredModels(dshHome, log)
  const remembered = await readCapabilityCache(dshHome, log)
  const apiKey = (await readStoredApiKey(dshHome)) || stringValue(options.fallbackApiKey) || undefined
  const catalogEndpoints = options.catalogEndpoints ?? orderedRendCoreCatalogEndpoints(options.preferredEndpoint)
  const discovery = await fetchFromCatalogEndpoints(catalogEndpoints, apiKey, log)

  let models: RendCoreModel[] = discovery.models
  let source: CatalogResult['source'] = discovery.source ?? 'bundled'

  if (models.length === 0 && !discovery.keyFilteredEmpty && discovery.rejectedStatus === undefined && apiKey) {
    try {
      const payload = await fetchJson(
        `${baseURL}/models`,
        { Authorization: `Bearer ${apiKey}` },
        15_000
      )
      models = mergeCatalogIds(parseModelIds(payload), [])
      if (models.length === 0) throw new Error('the gateway returned no chat models')
      source = 'online'
    } catch (error) {
      log(`[desktop] RendCore model discovery failed: ${message(error)}`)
    }
  }

  if (models.length > 0) {
    models = mergeRememberedCapabilities(models, remembered, false)
    const base = await readFile(basePatchPath, 'utf8')
    const rendered = replaceCatalog(replaceBaseURL(base, baseURL), models)
    await writeManagedText(cachedPath, rendered)
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
        await writeManagedText(cachedPath, replaceCatalog(replaceBaseURL(base, baseURL), cachedModels))
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
  await writeManagedText(cachedPath, replaceBaseURL(await readFile(basePatchPath, 'utf8'), baseURL))
  return { path: cachedPath, models: [], source: 'bundled' }
}

async function readActiveBaseURL(cachedPath: string): Promise<string | undefined> {
  if (!existsSync(cachedPath)) return undefined
  try {
    const content = await readFile(cachedPath, 'utf8')
    const match = content.match(/\n      rendcore:\r?\n[\s\S]*?\n        baseURL:\s*([^\r\n]+)/)
    return match?.[1]?.trim() || undefined
  } catch {
    return undefined
  }
}

// Preserve the composition's comments and expression tags, changing only this provider.
function replaceBaseURL(source: string, baseURL: string): string {
  return source.replace(/(\n      rendcore:\r?\n[\s\S]*?\n        baseURL:\s*)[^\r\n]+/, (_match, prefix: string) => `${prefix}${baseURL}`)
}

async function writeManagedText(path: string, text: string): Promise<void> {
  await writeFileAtomic(path, text, { mode: 0o600 })
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
  const defaultModel = models.some((model) => model.id === SAFE_DEFAULT_MODEL)
    ? SAFE_DEFAULT_MODEL
    : (models[0]?.id ?? SAFE_DEFAULT_MODEL)
  return source
    .replace(modelMarker, `$1${rows}`)
    .replace(
      /(summarizationProvider:\s*rendcore\r?\n\s+summarizationModel:\s*)[^\r\n]+/,
      `$1${summaryModel}`
    )
    .replace(
      /(id:\s*agent-default-model\r?\n[\s\S]*?provider:\s*rendcore\r?\n\s+model:\s*)[^\r\n]+/,
      `$1${defaultModel}`
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
  await writeManagedText(settingsPath, stringify(settings))
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
    await writeManagedText(settingsPath, stringify(settings))
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
    const contextWindow = positiveInteger(model.contextWindow ?? model.context_window ?? model.context)
    const maxTokens = clampMaxTokens(
      positiveInteger(model.maxTokens ?? model.max_tokens ?? model.max_output),
      contextWindow
    )
    return [{
      id,
      name: stringValue(model.name) || id,
      contextWindow,
      maxTokens,
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
  await writeManagedText(settingsPath, stringify(settings))
}

export async function readStoredApiKey(dshHome: string): Promise<string | undefined> {
  try {
    const credentials = parse(await readFile(join(dshHome, '.credentials.yaml'), 'utf8')) as unknown
    const root = objectValue(credentials)
    const refs = objectValue(root?.refs) ?? root
    return stringValue(refs?.RENDCORE_API_KEY) || undefined
  } catch {
    return undefined
  }
}

async function fetchCatalog(
  url: string,
  headers: Record<string, string> | undefined,
  timeoutMs: number
): Promise<{ ok: true; payload: unknown } | { ok: false; status?: number; error: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { headers, signal: controller.signal, redirect: 'error' })
    if (!response.ok) {
      await response.body?.cancel()
      return { ok: false, status: response.status, error: `HTTP ${response.status}` }
    }
    return { ok: true, payload: await response.json() }
  } catch (error) {
    return { ok: false, error: message(error) }
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchJson(url: string, headers: Record<string, string> | undefined, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { headers, signal: controller.signal, redirect: 'error' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
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
 * Fill in what the capability service did not state from the last answer it did.
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
      const contextWindow = positiveInteger(entry.contextWindow)
      remembered.set(id.toLowerCase(), {
        contextWindow,
        maxTokens: clampMaxTokens(positiveInteger(entry.maxTokens), contextWindow),
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
    await writeManagedText(join(dshHome, CAPABILITY_CACHE_FILE), `${JSON.stringify({ version: 1, models: entries }, undefined, 2)}\n`)
  } catch (error) {
    log(`[desktop] could not remember RendCore capabilities: ${message(error)}`)
  }
}

function message(error: unknown): string { return error instanceof Error ? error.message : String(error) }
