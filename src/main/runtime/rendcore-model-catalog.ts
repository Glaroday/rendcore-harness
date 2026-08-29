import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'

export const RENDCORE_MODELS_ENDPOINT = 'http://47.103.24.134:18036/v1/models'
export const RENDCORE_MODEL_CAPABILITIES_ENDPOINT = 'http://47.103.24.134:8600/api/models'
const SAFE_DEFAULT_MODEL = 'gpt-5.6-sol'

export interface RendCoreModel {
  id: string
  name: string
  contextWindow?: number
  maxTokens?: number
  input: Array<'text' | 'image' | 'video'>
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
    const base = await readFile(basePatchPath, 'utf8')
    const rendered = replaceCatalog(base, models)
    await writeFile(cachedPath, rendered, 'utf8')
    await syncStoredModels(dshHome, models)
    await repairDefaultModel(dshHome, new Set(models.map((model) => model.id)))
    log(`[desktop] loaded ${models.length} RendCore models from ${source}`)
    return { path: cachedPath, models, source }
  }

  if (existsSync(cachedPath)) {
    try {
      const cached = await readFile(cachedPath, 'utf8')
      const ids = [...cached.matchAll(/^\s+- id:\s*(.+?)\s*$/gm)]
        .map((match) => decodeYamlString(match[1] ?? ''))
        .filter(Boolean)
      if (ids.length > 0) {
        log(`[desktop] using cached RendCore model catalog (${ids.length} models)`)
        return { path: cachedPath, models: ids.map(fallbackModel), source: 'cache' }
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
    const input = normalizeInput(modalities, value, id)
    return [{
      id,
      name: stringValue(value.display_name ?? value.displayName ?? value.name) || id,
      contextWindow: positiveInteger(value.context ?? value.context_window ?? value.contextWindow),
      maxTokens: positiveInteger(value.max_output ?? value.max_tokens ?? value.maxTokens),
      input,
      reasoningEfforts: parseReasoning(value.thinking ?? value.reasoning_efforts ?? value.reasoningEfforts)
    }]
  }))
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
  const vision = /(gpt-5|gemini|claude|vision|qwen3\.8|ox-alpha|muse-spark)/.test(normalized)
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
  return { id, name: id, contextWindow, maxTokens, input: vision ? ['text', 'image'] : ['text'], reasoningEfforts }
}

function replaceCatalog(source: string, models: RendCoreModel[]): string {
  const modelMarker = /(\n        models:\r?\n)[\s\S]*?(?=\r?\n\r?\n\S)/
  if (!modelMarker.test(source)) throw new Error('RendCore provider model block was not found')
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
  rendcore.models = models.map((model) => ({ ...model }))
  await writeFile(settingsPath, stringify(settings), 'utf8')
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
  if (Array.isArray(value)) {
    const efforts = Object.fromEntries(value.filter((item): item is string => typeof item === 'string').map((item) => [item, item]))
    return Object.keys(efforts).length > 0 ? efforts : undefined
  }
  if (value && typeof value === 'object') {
    const efforts = Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([, item]) => typeof item === 'string' || item === null)) as Record<string, string | null>
    return Object.keys(efforts).length > 0 ? efforts : undefined
  }
  return undefined
}

function normalizeInput(values: string[], model: Record<string, unknown>, id: string): RendCoreModel['input'] {
  const normalized = values.map((value) => value.toLowerCase()).filter((value): value is 'text' | 'image' | 'video' => ['text', 'image', 'video'].includes(value))
  if (normalized.length > 0) return normalized.includes('text') ? [...new Set(normalized)] : ['text', ...new Set(normalized)]
  if (model.supports_vision === true || model.supportsVision === true) return ['text', 'image']
  return fallbackModel(id).input
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
function decodeYamlString(value: string): string { try { const parsed = parse(value) as unknown; return typeof parsed === 'string' ? parsed.trim() : '' } catch { return value.trim().replace(/^['"]|['"]$/g, '') } }
function message(error: unknown): string { return error instanceof Error ? error.message : String(error) }
