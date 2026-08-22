import type { SpawnOptionsWithoutStdio } from 'node:child_process'
import type { EventEmitter } from 'node:events'
import { createWriteStream, existsSync, mkdirSync, type WriteStream } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, join } from 'node:path'
import { parse, stringify } from 'yaml'
import type { RuntimePhase, RuntimeSnapshot } from '../../shared/contracts'

export const RENDCORE_MODELS_ENDPOINT = 'http://47.103.24.134:18036/v1/models'
const RENDCORE_SAFE_DEFAULT_MODEL = 'gpt-5.6-sol'

export interface HarnessRuntimeOptions {
  dshEntryPath: string
  nodeExecutablePath: string
  nodeEntryPath: string
  dshPatchPath: string
  dshHome: string
  logPath: string
  launchProcess(
    executablePath: string,
    args: string[],
    options: SpawnOptionsWithoutStdio
  ): HarnessChildProcess
  startupTimeoutMs?: number
  onChanged(snapshot: RuntimeSnapshot): void
}

export interface HarnessChildProcess extends EventEmitter {
  readonly stdout: NodeJS.ReadableStream
  readonly stderr: NodeJS.ReadableStream
  readonly exitCode: number | null
  kill(signal?: NodeJS.Signals): boolean
}

export function buildHarnessArguments(port: number, patchPath?: string): string[] {
  return [
    'web',
    ...(patchPath ? ['--patch', patchPath] : []),
    // The desktop window is the only intended surface. Without this, Harness
    // hands the same loopback URL to the system browser on every launch.
    '--no-open',
    '--host',
    '127.0.0.1',
    '--port',
    String(port)
  ]
}

export function buildHarnessSpawnOptions(
  launchDirectory: string,
  dshHome: string,
  platform: NodeJS.Platform = process.platform,
  environment: NodeJS.ProcessEnv = process.env
): SpawnOptionsWithoutStdio {
  const {
    ELECTRON_RUN_AS_NODE: _runAsNode,
    // Keep credentials file-backed and writable from Settings > Models. An
    // inherited env value is deliberately treated as read-only by DSH.
    RENDCORE_API_KEY: _rendCoreApiKey,
    ...parentEnvironment
  } = environment
  const pathKey = platform === 'win32' ? 'Path' : 'PATH'

  return {
    cwd: launchDirectory,
    env: {
      ...parentEnvironment,
      DSH_HOME: dshHome,
      NO_COLOR: '1',
      // Keep pnpm's child processes bounded and preserve the same behavior
      // when it is launched through Electron's bundled Node runtime.
      PNPM_MAX_WORKERS: '1',
      npm_config_child_concurrency: '1',
      npm_config_package_import_method: 'clone-or-copy',
      npm_config_side_effects_cache: 'false',
      PNPM_CONFIG_CHILD_CONCURRENCY: '1',
      PNPM_CONFIG_PACKAGE_IMPORT_METHOD: 'clone-or-copy',
      PNPM_CONFIG_SIDE_EFFECTS_CACHE: 'false',
      [pathKey]: environment[pathKey] ?? environment.PATH ?? ''
    },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true
  }
}

export function buildNodeArguments(
  nodeEntryPath: string,
  dshEntryPath: string,
  port: number,
  patchPath?: string
): string[] {
  return [
    '--expose-internals',
    nodeEntryPath,
    dshEntryPath,
    ...buildHarnessArguments(port, patchPath)
  ]
}

export function updateReadyStability(
  readySince: number | undefined,
  healthy: boolean,
  now: number,
  stabilityWindowMs = 500
): { readySince: number | undefined; ready: boolean } {
  if (!healthy) return { readySince: undefined, ready: false }
  const stableSince = readySince ?? now
  return {
    readySince: stableSince,
    ready: now - stableSince >= stabilityWindowMs
  }
}

export function extractRendCoreModelBlock(source: string): string | undefined {
  return source.match(
    /\r?\n        models:\r?\n([\s\S]*?)(?=\r?\n\r?\n\S)/
  )?.[1]
}

export function replaceRendCoreModelBlock(source: string, modelBlock: string): string {
  const marker = /\r?\n        models:\r?\n[\s\S]*?(?=\r?\n\r?\n\S)/
  if (!marker.test(source)) throw new Error('RendCore provider model block was not found')
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const normalizedBlock = modelBlock.replace(/\r?\n/g, eol)
  return source.replace(
    marker,
    `${eol}        models:${eol}${normalizedBlock}`
  )
}

export class HarnessRuntime {
  private child?: HarnessChildProcess
  private logStream?: WriteStream
  private phase: RuntimePhase = 'idle'
  private message = 'Harness is not running.'
  private launchDirectory?: string
  private url?: string
  private readonly logLines: string[] = []

  constructor(private readonly options: HarnessRuntimeOptions) {}

  snapshot(): RuntimeSnapshot {
    return {
      phase: this.phase,
      message: this.message,
      launchDirectory: this.launchDirectory,
      url: this.url,
      logs: [...this.logLines]
    }
  }

  async start(launchDirectory: string): Promise<void> {
    await this.stop()
    this.launchDirectory = launchDirectory
    this.url = undefined

    if (!existsSync(this.options.dshEntryPath)) {
      this.setState('failed', `Harness entry was not found: ${this.options.dshEntryPath}`)
      return
    }
    if (!existsSync(this.options.nodeExecutablePath)) {
      this.setState('failed', `Bundled Node.js runtime was not found: ${this.options.nodeExecutablePath}`)
      return
    }
    if (!existsSync(this.options.nodeEntryPath)) {
      this.setState('failed', `Harness diagnostic entry was not found: ${this.options.nodeEntryPath}`)
      return
    }
    if (!existsSync(this.options.dshPatchPath)) {
      this.setState('failed', `RendCore Harness patch was not found: ${this.options.dshPatchPath}`)
      return
    }

    await mkdir(this.options.dshHome, { recursive: true })
    await mkdir(dirname(this.options.logPath), { recursive: true })
    this.logStream = createWriteStream(this.options.logPath, { flags: 'a' })

    const apiKey = await readStoredRendCoreApiKey(this.options.dshHome)
    const cachedPath = join(this.options.dshHome, 'rendcore-online.patch.yml')
    let patchPath = this.options.dshPatchPath

    // Refresh before composing the profile so additions and removals from the
    // gateway take effect on this restart. A cached catalog remains the fast
    // fallback when the endpoint is temporarily unavailable.
    let onlineCatalog: OnlinePatchResult | undefined
    if (apiKey) {
      try {
        onlineCatalog = await createOnlineRendCorePatch(this.options.dshPatchPath, this.options.dshHome, apiKey)
        patchPath = onlineCatalog.path
        await syncStoredRendCoreModels(this.options.dshHome, onlineCatalog.models)
        this.writeLog(`[desktop] refreshed ${onlineCatalog.modelCount} models from RendCore /v1/models`)
      } catch (error) {
        this.writeLog(
          `[desktop] online model discovery failed; using cached catalog when available: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      }
    }
    if (!onlineCatalog) {
      if (existsSync(cachedPath)) {
        try {
          patchPath = (await createCachedRendCorePatch(
            this.options.dshPatchPath,
            this.options.dshHome,
            cachedPath
          )).path
          this.writeLog('[desktop] using cached RendCore model catalog')
        } catch (error) {
          this.writeLog(
            `[desktop] cached model catalog is invalid; using bundled catalog: ${
              error instanceof Error ? error.message : String(error)
            }`
          )
        }
      } else {
        this.writeLog('[desktop] using bundled RendCore model catalog')
      }
    }

    await repairInvalidRendCoreDefaultModel(this.options.dshHome)

    const port = await reservePort()
    const url = `http://127.0.0.1:${port}`
    const args = buildNodeArguments(
      this.options.nodeEntryPath,
      this.options.dshEntryPath,
      port,
      patchPath
    )
    const startupTimeoutMs =
      this.options.startupTimeoutMs ?? (process.platform === 'win32' ? 120_000 : 45_000)

    this.writeLog(`\n[desktop] starting ${new Date().toISOString()}`)
    this.writeLog(`[desktop] launch directory ${launchDirectory}`)
    this.writeLog(`[desktop] endpoint ${url}`)
    this.setState('starting', 'Starting RendCore Harness…')

    let child: HarnessChildProcess
    try {
      child = this.options.launchProcess(
        this.options.nodeExecutablePath,
        args,
        buildHarnessSpawnOptions(launchDirectory, this.options.dshHome, process.platform, process.env)
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.writeLog(`[utility] launch failed: ${message}`)
      this.setState('failed', `Harness could not start: ${message}`)
      return
    }
    this.child = child

    child.stdout.on('data', (chunk: Buffer) => this.writeChunk('stdout', chunk))
    child.stderr.on('data', (chunk: Buffer) => this.writeChunk('stderr', chunk))
    child.once('spawn', () => this.writeLog('[desktop] Bundled Node.js Harness process started'))
    child.once('error', (error) => {
      this.writeLog(`[node] ${error.stack ?? error.message}`)
      if (this.child !== child) return
      this.child = undefined
      this.setState('failed', `Harness could not start: ${error.message}`)
    })
    child.once('exit', (code, signal) => {
      const detail = signal ? `signal ${signal}` : formatExitCode(code ?? -1)
      this.writeLog(`[node] Harness process exited (${detail})`)
      if (this.child !== child) return
      this.child = undefined
      const cause = extractFailureCause(this.logLines)
      this.setState(
        'failed',
        cause
          ? `Harness stopped unexpectedly (${detail}).
${cause}`
          : `Harness stopped unexpectedly (${detail}).`
      )
    })

    const startedAt = Date.now()
    const progressTimer = setInterval(
      () => this.writeLog(`[desktop] waiting for Harness (${Math.round((Date.now() - startedAt) / 1000)}s)`),
      10_000
    )
    const ready = await waitUntilReady(
      url,
      () => this.child === child && child.exitCode === null,
      startupTimeoutMs
    ).finally(() => clearInterval(progressTimer))

    if (this.child !== child) return
    if (!ready) {
      await this.stopChild(child)
      this.setState(
        'failed',
        `Harness did not become ready within ${Math.round(startupTimeoutMs / 1000)} seconds.`
      )
      return
    }

    this.url = url
    this.setState('ready', 'Harness is ready.')
  }

  async stop(): Promise<void> {
    const child = this.child
    if (!child) {
      this.closeLog()
      if (this.phase !== 'failed') this.setState('idle', 'Harness is not running.')
      return
    }

    this.setState('stopping', 'Stopping Harness…')
    this.child = undefined
    await this.stopChild(child)
    this.closeLog()
    this.url = undefined
    this.setState('idle', 'Harness is not running.')
  }

  private async stopChild(child: HarnessChildProcess): Promise<void> {
    if (child.exitCode !== null) return
    const exitPromise = new Promise<boolean>((resolve) =>
      child.once('exit', () => resolve(true))
    )
    child.kill('SIGTERM')
    const exited = await Promise.race([
      exitPromise,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 4_000))
    ])
    if (!exited && child.exitCode === null) child.kill('SIGKILL')
  }

  private setState(phase: RuntimePhase, message: string): void {
    this.phase = phase
    this.message = message
    this.options.onChanged(this.snapshot())
  }

  private writeChunk(source: 'stdout' | 'stderr', chunk: Buffer): void {
    for (const line of chunk.toString('utf8').split(/\r?\n/)) {
      if (line.length > 0) this.writeLog(`[${source}] ${line}`)
    }
  }

  /** Record desktop-side diagnostics, including before a launch opens the log. */
  note(line: string): void {
    if (!this.logStream) {
      try {
        mkdirSync(dirname(this.options.logPath), { recursive: true })
        this.logStream = createWriteStream(this.options.logPath, { flags: 'a' })
      } catch {
        // Keep the line in memory when the log directory is unavailable.
      }
    }
    this.writeLog(line)
  }

  private writeLog(line: string): void {
    this.logLines.push(line)
    if (this.logLines.length > 200) this.logLines.splice(0, this.logLines.length - 200)
    this.logStream?.write(`${line}\n`)
  }

  private closeLog(): void {
    this.logStream?.end()
    this.logStream = undefined
  }
}

interface OnlineModelResponse {
  data?: unknown
}

interface OnlineModelEntry {
  id: string
  contextWindow?: number
  maxTokens?: number
  input?: Array<'text' | 'image'>
  reasoningEfforts?: false | Record<string, string | null>
}

interface OnlinePatchResult {
  path: string
  modelCount: number
  models: OnlineModelEntry[]
}

async function createOnlineRendCorePatch(
  basePatchPath: string,
  dshHome: string,
  apiKey?: string
): Promise<OnlinePatchResult> {
  if (!apiKey?.trim()) {
    throw new Error('RendCore API key is not configured; enter it in Settings > Models')
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(RENDCORE_MODELS_ENDPOINT, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = (await response.json()) as OnlineModelResponse
    const models = Array.isArray(payload.data)
      ? payload.data
          .map((entry): OnlineModelEntry | undefined => {
            if (typeof entry === 'string') {
              const id = entry.trim()
              if (id.length === 0) return undefined
              if (isImageGenerationOnlyModel(id)) return undefined
              const known = knownModelCapabilities(id)
              return {
                id,
                ...(known?.contextWindow === undefined ? {} : { contextWindow: known.contextWindow }),
                ...(known?.maxTokens === undefined ? {} : { maxTokens: known.maxTokens }),
                input: known?.input ?? inferModelInput(id) ?? ['text']
              }
            }
            if (!entry || typeof entry !== 'object') return undefined
            const value = entry as Record<string, unknown>
            const id = typeof value.id === 'string' ? value.id.trim() : ''
            if (id.length === 0) return undefined
            if (isImageGenerationOnlyModel(id, value)) return undefined
            const known = knownModelCapabilities(id)
            const contextWindow = known?.contextWindow ?? positiveInteger(
              value.context_window ?? value.contextWindow ?? value.context_length ?? value.contextLength
            )
            const maxTokens = known?.maxTokens ?? positiveInteger(
              value.max_tokens ?? value.maxTokens ?? value.max_output_tokens ?? value.maxOutputTokens
            )
            const input = known?.input ?? resolveModelInput(value, id)
            const reasoningEfforts = resolveReasoningEfforts(value)
            return {
              id,
              ...(contextWindow === undefined ? {} : { contextWindow }),
              ...(maxTokens === undefined ? {} : { maxTokens }),
              ...(input === undefined ? {} : { input }),
              ...(reasoningEfforts === undefined ? {} : { reasoningEfforts })
            }
          })
          .filter((model): model is OnlineModelEntry => model !== undefined)
          .filter((model, index, all) => all.findIndex((candidate) => candidate.id === model.id) === index)
      : []
    if (models.length === 0) throw new Error('the endpoint returned no model ids')

    const source = await readFile(basePatchPath, 'utf8')
    const modelBlock = models
      .map((model) => [
        `          - id: ${JSON.stringify(model.id)}`,
        `            name: ${JSON.stringify(model.id)}`,
        ...(model.contextWindow === undefined ? [] : [`            contextWindow: ${model.contextWindow}`]),
        ...(model.maxTokens === undefined ? [] : [`            maxTokens: ${model.maxTokens}`]),
        ...(model.input === undefined ? [] : [`            input: ${JSON.stringify(model.input)}`]),
        ...(model.reasoningEfforts === undefined
          ? []
          : [
              `            reasoningEfforts: ${
                model.reasoningEfforts === false ? 'false' : JSON.stringify(model.reasoningEfforts)
              }`
            ])
      ].join('\n'))
      .join('\n')
    const dynamicPatch = replaceRendCoreModelBlock(source, modelBlock)
    const dynamicPath = join(dshHome, 'rendcore-online.patch.yml')
    await writeFile(dynamicPath, dynamicPatch, 'utf8')
    return { path: dynamicPath, modelCount: models.length, models }
  } finally {
    clearTimeout(timeout)
  }
}

/** Replace a user-layer RendCore catalog after a successful online refresh. */
async function syncStoredRendCoreModels(dshHome: string, models: OnlineModelEntry[]): Promise<void> {
  const settingsPath = join(dshHome, 'settings.yaml')
  if (!existsSync(settingsPath)) return

  const source = await readFile(settingsPath, 'utf8')
  const settings = parse(source) as Record<string, unknown> | null
  if (!settings || typeof settings !== 'object') return
  const llm = settings['llm-pi-ai']
  if (!llm || typeof llm !== 'object' || Array.isArray(llm)) return
  const providers = (llm as Record<string, unknown>).providers
  if (!providers || typeof providers !== 'object' || Array.isArray(providers)) return
  const rendcore = (providers as Record<string, unknown>).rendcore
  if (!rendcore || typeof rendcore !== 'object' || Array.isArray(rendcore)) return
  const currentModels = (rendcore as Record<string, unknown>).models
  if (!Array.isArray(currentModels)) return

  const nextModels = models.map((model) => ({
    id: model.id,
    name: model.id,
    ...(model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }),
    ...(model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens }),
    ...(model.input === undefined ? {} : { input: model.input }),
    ...(model.reasoningEfforts === undefined ? {} : { reasoningEfforts: model.reasoningEfforts })
  }))
  const rendcoreRecord = rendcore as Record<string, unknown>
  rendcoreRecord.models = nextModels
  const updated = stringify(settings)
  if (updated !== source) await writeFile(settingsPath, updated, 'utf8')
}

async function createCachedRendCorePatch(
  basePatchPath: string,
  dshHome: string,
  cachedPath: string
): Promise<OnlinePatchResult> {
  const [baseSource, cachedSource] = await Promise.all([
    readFile(basePatchPath, 'utf8'),
    readFile(cachedPath, 'utf8')
  ])
  const modelSection = extractRendCoreModelBlock(cachedSource)
  if (!modelSection) throw new Error('cached RendCore model block was not found')
  const ids = [...modelSection.matchAll(/^\s+- id: (.+?)\s*$/gm)]
    .map((match) => {
      const raw = match[1] ?? ''
      try {
        const value = parse(raw) as unknown
        return typeof value === 'string' ? value.trim() : ''
      } catch {
        return raw.trim().replace(/^['"]|['"]$/g, '')
      }
    })
    .filter((id, index, all) => id.length > 0 && all.indexOf(id) === index)
    .filter((id) => !isImageGenerationOnlyModel(id))
  if (ids.length === 0) throw new Error('cached RendCore model block was empty')

  const models = ids.map((id): OnlineModelEntry => {
    const known = knownModelCapabilities(id)
    return {
      id,
      ...(known?.contextWindow === undefined ? {} : { contextWindow: known.contextWindow }),
      ...(known?.maxTokens === undefined ? {} : { maxTokens: known.maxTokens }),
      input: known?.input ?? inferModelInput(id) ?? ['text']
    }
  })
  const modelBlock = models
    .map((model) => [
      '          - id: ' + JSON.stringify(model.id),
      '            name: ' + JSON.stringify(model.id),
      ...(model.contextWindow === undefined ? [] : ['            contextWindow: ' + model.contextWindow]),
      ...(model.maxTokens === undefined ? [] : ['            maxTokens: ' + model.maxTokens]),
      ...(model.input === undefined ? [] : ['            input: ' + JSON.stringify(model.input)])
    ].join('\n'))
    .join('\n')
  const dynamicPatch = replaceRendCoreModelBlock(baseSource, modelBlock)
  await writeFile(cachedPath, dynamicPatch, 'utf8')
  return { path: cachedPath, modelCount: models.length, models }
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined
}

function isImageGenerationOnlyModel(id: string, value?: Record<string, unknown>): boolean {
  const normalized = id.trim().toLowerCase()
  if (/^(gpt-image|dall-e|imagen|flux|stable-diffusion|sdxl|midjourney)(?:[-_.]|$)/.test(normalized)) {
    return true
  }
  const task = value?.task ?? value?.type ?? value?.capability
  if (typeof task === 'string' && /image[-_ ]?generation|text[-_ ]?to[-_ ]?image/i.test(task)) return true
  const output = value?.output ?? value?.outputs ?? value?.output_modalities ?? value?.outputModalities
  if (Array.isArray(output)) {
    const modalities = output.filter((item): item is string => typeof item === 'string').map((item) => item.toLowerCase())
    if (modalities.includes('image') && !modalities.includes('text')) return true
  }
  return false
}

async function repairInvalidRendCoreDefaultModel(dshHome: string): Promise<void> {
  const settingsPath = join(dshHome, 'settings.yaml')
  if (!existsSync(settingsPath)) return
  const source = await readFile(settingsPath, 'utf8')
  const settings = parse(source) as Record<string, unknown> | null
  const selected = settings?.['agent-default-model']
  if (!selected || typeof selected !== 'object') return
  const provider = (selected as Record<string, unknown>).provider
  const model = (selected as Record<string, unknown>).model
  if (provider !== 'rendcore' || typeof model !== 'string' || !isImageGenerationOnlyModel(model)) return
  const pattern = /(^agent-default-model:\s*\r?\n(?:^[ \t]+[^\r\n]*\r?\n)*?^[ \t]+model:\s*)[^\r\n]+/m
  if (!pattern.test(source)) return
  await writeFile(settingsPath, source.replace(pattern, `$1${RENDCORE_SAFE_DEFAULT_MODEL}`), 'utf8')
}

async function readStoredRendCoreApiKey(dshHome: string): Promise<string | undefined> {
  const fromEnvironment = process.env.RENDCORE_API_KEY?.trim()
  if (fromEnvironment) return fromEnvironment
  try {
    const credentials = parse(await readFile(join(dshHome, '.credentials.yaml'), 'utf8')) as unknown
    if (!credentials || typeof credentials !== 'object') return undefined
    const root = credentials as Record<string, unknown>
    const refs = root.refs && typeof root.refs === 'object'
      ? root.refs as Record<string, unknown>
      : root
    const value = refs.RENDCORE_API_KEY
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
  } catch {
    return undefined
  }
}

function resolveModelInput(
  value: Record<string, unknown>,
  id: string
): Array<'text' | 'image'> | undefined {
  const raw = value.input ?? value.modalities ?? value.modalities_supported ?? value.supported_modalities
  if (Array.isArray(raw)) {
    const input = raw.filter((item): item is 'text' | 'image' => item === 'text' || item === 'image')
    if (input.length > 0) return input.includes('text') ? input : ['text', ...input]
  }
  const imageFlag = value.supports_vision ?? value.supportsVision ?? value.vision ?? value.supports_image ?? value.supportsImage
  if (imageFlag === true) return ['text', 'image']
  if (imageFlag === false) return ['text']
  return inferModelInput(id) ?? knownModelCapabilities(id)?.input ?? ['text']
}

function inferModelInput(id: string): Array<'text' | 'image'> | undefined {
  const normalized = id.toLowerCase()
  if (/(gemini|claude|vision|\bvl\b|omni|image|\b4o\b|gpt-5)/i.test(normalized)) {
    return ['text', 'image']
  }
  return undefined
}

function knownModelCapabilities(id: string): OnlineModelEntry | undefined {
  const normalized = id.toLowerCase()
  if (/^gpt-5\.6-(sol|terra|luna)$/.test(normalized)) {
    return { id, contextWindow: 1_050_000, maxTokens: 128_000, input: ['text', 'image'] }
  }
  if (normalized === 'gpt-5.5' || normalized === 'gpt-5.4') {
    return { id, contextWindow: 1_050_000, maxTokens: 128_000, input: ['text', 'image'] }
  }
  if (normalized === 'gpt-5.4-mini' || normalized.includes('gpt-5.3-codex')) {
    return { id, contextWindow: 400_000, maxTokens: 128_000, input: ['text', 'image'] }
  }
  if (normalized.startsWith('gemini-3')) {
    return { id, contextWindow: 1_048_576, maxTokens: 65_536, input: ['text', 'image'] }
  }
  if (normalized === 'claude-opus-4-6-thinking' || normalized === 'claude-sonnet-4-6') {
    return { id, contextWindow: 1_000_000, maxTokens: 128_000, input: ['text', 'image'] }
  }
  if (normalized.startsWith('gpt-oss-120b')) {
    return { id, contextWindow: 131_072, maxTokens: 131_072, input: ['text'] }
  }
  if (normalized.startsWith('muse-spark-1.2')) {
    return { id, contextWindow: 1_000_000, maxTokens: 131_072, input: ['text', 'image'] }
  }
  if (normalized === 'deepseek-v4-pro' || normalized === 'deepseek-v4-flash') {
    return { id, contextWindow: 1_000_000, maxTokens: 131_072, input: ['text'] }
  }
  if (normalized === 'deepseek-v4-flash-vision-exp') {
    return { id, contextWindow: 1_000_000, maxTokens: 131_072, input: ['text', 'image'] }
  }
  if (normalized === 'glm-5.2') {
    return { id, contextWindow: 1_000_000, maxTokens: 131_072, input: ['text'] }
  }
  if (normalized === 'minimax-m3') {
    return { id, contextWindow: 1_000_000, maxTokens: 131_072, input: ['text', 'image'] }
  }
  if (normalized === 'qwen3.6-plus' || normalized === 'qwen3.7-plus') {
    return { id, contextWindow: 1_000_000, maxTokens: 65_536, input: ['text', 'image'] }
  }
  if (normalized === 'mimo-v2.5') {
    return { id, contextWindow: 1_000_000, maxTokens: 131_072, input: ['text', 'image'] }
  }
  if (normalized === 'qwen3.8-35b-a3b') {
    return { id, contextWindow: 1_000_000, input: ['text', 'image'] }
  }
  if (normalized === 'hy3') {
    return { id, contextWindow: 262_144, maxTokens: 262_144, input: ['text'] }
  }
  if (normalized === 'ox-alpha-free') {
    return { id, contextWindow: 1_000_000, maxTokens: 131_072, input: ['text', 'image'] }
  }
  return undefined
}

function resolveReasoningEfforts(value: Record<string, unknown>): false | Record<string, string | null> | undefined {
  if (value.reasoning === false || value.supports_reasoning === false || value.supportsReasoning === false) return false
  const raw = value.reasoning_efforts ?? value.reasoningEfforts
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const result: Record<string, string | null> = {}
    for (const [key, item] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof item === 'string' || item === null) result[key] = item
    }
    return Object.keys(result).length > 0 ? result : undefined
  }
  return undefined
}

function latestHarnessAttemptLogs(logLines: readonly string[]): readonly string[] {
  for (let index = logLines.length - 1; index >= 0; index -= 1) {
    if (logLines[index]?.trimStart().startsWith('[desktop] starting ')) {
      return logLines.slice(index + 1)
    }
  }
  return logLines
}

export function extractFailureCause(logLines: readonly string[]): string | undefined {
  const stderrLines: string[] = []
  let dshEntryError: string | undefined
  let uncaughtError: string | undefined

  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const text = line.slice(8)
    stderrLines.push(text)

    if (dshEntryError === undefined) {
      const m = text.match(/DSH entry failed:\s*(.+)/)
      if (m && m[1]) dshEntryError = m[1].trim()
    }

    if (uncaughtError === undefined) {
      const m1 = text.match(/uncaught exception:\s*(.+)/)
      if (m1 && m1[1]) {
        uncaughtError = m1[1].trim()
      } else {
        const m2 = text.match(/unhandled rejection:\s*(.+)/)
        if (m2 && m2[1]) uncaughtError = m2[1].trim()
      }
    }
  }

  if (dshEntryError) return dshEntryError
  if (uncaughtError) return uncaughtError

  for (let i = stderrLines.length - 1; i >= 0; i--) {
    const line = stderrLines[i]?.trim()
    if (!line) continue
    if (line.length < 200 && /\b(error|Error|ERROR|failed|Failed|FAILED)\b/.test(line)) {
      return line
    }
  }

  if (stderrLines.length > 0) {
    const last = stderrLines[stderrLines.length - 1]?.trim()
    if (last && last.length < 200) return last
  }

  return undefined
}

const CORE_BUNDLES = new Set(['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dshmarket'])
const PACKAGE_REFERENCE_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i

function isPackageReference(value: string): boolean {
  const candidate = value.trim()
  if (!candidate || candidate.includes(':')) return false
  return PACKAGE_REFERENCE_PATTERN.test(candidate)
}

function isActionablePluginReference(value: string): boolean {
  const candidate = value.trim()
  return (
    isPackageReference(candidate) &&
    !CORE_BUNDLES.has(candidate) &&
    !candidate.startsWith('@deepseek-ai/')
  )
}

function extractPluginReferences(
  logLines: readonly string[],
  accepts: (value: string) => boolean
): string[] {
  const plugins = new Set<string>()

  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const text = line.slice(8)

    const m1 = text.match(/failed to apply loader entry [^\s]+ \((@[^)]+|[^)]+)\)/i)
    if (m1 && m1[1] && accepts(m1[1])) {
      plugins.add(m1[1].trim())
    }

    const m2 = text.match(/cannot resolve profile bundle ["']([^"']+)["']/i)
    if (m2 && m2[1] && accepts(m2[1])) {
      plugins.add(m2[1].trim())
    }

    const m3 = text.match(/profile bundle ["']([^"']+)["'] declares no dsh\.bundle/i)
    if (m3 && m3[1] && accepts(m3[1])) {
      plugins.add(m3[1].trim())
    }

    const m4 = text.match(/failed to import loader entry [^\s]+ \((@[^)]+|[^)]+)\)/i)
    if (m4 && m4[1] && accepts(m4[1])) {
      plugins.add(m4[1].trim())
    }

    const m5 = text.match(/plugin\(s\) failed to load:\s*([a-zA-Z0-9@/_-]+)/i)
    if (m5 && m5[1] && accepts(m5[1])) {
      plugins.add(m5[1].trim())
    }

    const bootFailureLines = text.split(/\r?\n/).map((value) => value.trim())
    const bootFailureTitle = bootFailureLines.findIndex((value) => value === 'Failed to load plugins')
    if (bootFailureTitle >= 0) {
      for (const candidate of bootFailureLines.slice(bootFailureTitle + 1)) {
        if (accepts(candidate)) plugins.add(candidate)
      }
    }
  }

  return [...plugins]
}

export function extractPluginFailureReferences(logLines: readonly string[]): string[] {
  return extractPluginReferences(logLines, isPackageReference)
}

export function extractOffendingPlugins(logLines: readonly string[]): string[] {
  return extractPluginReferences(logLines, isActionablePluginReference)
}

export function extractDuplicateLoaderEntryId(
  logLines: readonly string[]
): string | undefined {
  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const match = line.slice(8).match(/duplicate loader entry id:\s*["']?([^\s"']+)["']?/i)
    if (match?.[1]) return match[1].trim()
  }
  return undefined
}

export function extractSlotConflictName(
  logLines: readonly string[]
): string | undefined {
  for (const line of latestHarnessAttemptLogs(logLines)) {
    if (!line.startsWith('[stderr] ')) continue
    const text = line.slice(8)
    const loaderMatch = text.match(
      /single slot\s+["']([^"']+)["']\s+already has a registration/i
    )
    if (loaderMatch?.[1]) return loaderMatch[1].trim()
    const rendererMatch = text.match(
      /UI slot\s+["']([^"']+)["']\s+has duplicate registrations/i
    )
    if (rendererMatch?.[1]) return rendererMatch[1].trim()
  }
  return undefined
}

export function extractOffendingPlugin(logLines: readonly string[]): string | undefined {
  return extractOffendingPlugins(logLines)[0]
}

export function formatExitCode(code: number): string {
  const unsigned = code >>> 0
  const hexadecimal = `0x${unsigned.toString(16).padStart(8, '0').toUpperCase()}`
  if (unsigned === 0xffff7003) {
    return `exit code ${unsigned} (${hexadecimal}, Crashpad handler unavailable)`
  }
  return `exit code ${code} (${hexadecimal})`
}

async function reservePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.unref()
    server.once('error', reject)
    server.listen({ host: '127.0.0.1', port: 0 }, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('Could not reserve a local port.'))
        return
      }
      const { port } = address
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })
}

async function waitUntilReady(
  url: string,
  isAlive: () => boolean,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  const stabilityWindowMs = 500
  let readySince: number | undefined
  while (Date.now() < deadline && isAlive()) {
    try {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(1_000) })
      const stability = updateReadyStability(
        readySince,
        response.status >= 200 && response.status < 500,
        Date.now(),
        stabilityWindowMs
      )
      readySince = stability.readySince
      if (stability.ready) return true
    } catch {
      // The server is expected to reject connections while it is booting.
      readySince = updateReadyStability(readySince, false, Date.now()).readySince
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return false
}
