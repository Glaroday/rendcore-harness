import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import type { RendCoreUpstreamSnapshot } from '../../shared/rendcore-upstreams'
import { RENDCORE_API_ENDPOINTS, probeRendCoreEndpoint } from './rendcore-gateway'
import { readStoredApiKey } from './rendcore-model-catalog'

export class RendCoreUpstreamSettings {
  private preferred: string | null = null
  private selected: string | null = null
  private writing: Promise<void> = Promise.resolve()
  private probing?: Promise<RendCoreUpstreamSnapshot>
  private readonly path: string

  constructor(private readonly dshHome: string, private readonly keyFromEnvironment: Promise<string | undefined>) {
    this.path = join(dshHome, '.rendcore-upstreams.json')
  }

  async load(): Promise<void> {
    try {
      const value: unknown = JSON.parse(await readFile(this.path, 'utf8'))
      if (isEndpoint(value)) this.preferred = value
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') console.warn('[rendcore] Could not load upstream preference')
    }
  }

  get preferredEndpoint(): string | undefined { return this.preferred ?? undefined }

  recordSelected(endpoint: string): void { this.selected = endpoint }

  snapshot(): RendCoreUpstreamSnapshot {
    return { preferred: this.preferred, selected: this.selected, endpoints: RENDCORE_API_ENDPOINTS.map(url => ({ url })) }
  }

  async save(value: unknown): Promise<RendCoreUpstreamSnapshot> {
    if (value !== null && !isEndpoint(value)) throw new Error('Invalid RendCore upstream')
    const operation = this.writing.catch(() => undefined).then(async () => {
      await writeFileAtomic(this.path, JSON.stringify(value), { mode: 0o600 })
      this.preferred = value
    })
    this.writing = operation
    await operation
    return this.snapshot()
  }

  probe(): Promise<RendCoreUpstreamSnapshot> {
    this.probing ??= this.probeAll().finally(() => { this.probing = undefined })
    return this.probing
  }

  private async probeAll(): Promise<RendCoreUpstreamSnapshot> {
    const key = await this.keyFromEnvironment || await readStoredApiKey(this.dshHome)
    const signal = AbortSignal.timeout(4000)
    const endpoints = await Promise.all(RENDCORE_API_ENDPOINTS.map(async url => ({
      url, status: await probeRendCoreEndpoint(url, key ? `Bearer ${key}` : undefined, signal)
    })))
    return { ...this.snapshot(), endpoints }
  }
}

function isEndpoint(value: unknown): value is string {
  return typeof value === 'string' && RENDCORE_API_ENDPOINTS.some(endpoint => endpoint === value)
}
