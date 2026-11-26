import { migrateRendCoreEndpoints } from './rendcore-endpoint-migration'
import { prepareRendCoreModelCatalog } from './rendcore-model-catalog'
import { startRendCoreGateway, type RendCoreGateway } from './rendcore-gateway'

import type { RendCoreUpstreamSettings } from './rendcore-upstream-settings'

interface BackendHost {
  start(): Promise<unknown>
  stop(): Promise<void>
}

/** Owns the route and overlay for exactly one backend attempt, including cancelled boots. */
export class RendCoreBackendHost implements BackendHost {
  private gateway?: RendCoreGateway
  private host?: BackendHost
  private preparation?: Promise<string>
  private stopped = false
  private stopping?: Promise<void>

  constructor(private readonly options: {
    dshHome: string
    profile: string
    productPatch: string
    enableRendCore?: boolean
    upstreams?: RendCoreUpstreamSettings
    log: (line: string) => void
    createHost: (patch: string) => BackendHost
  }) {}

  get gatewayBaseURL(): string | undefined {
    return this.gateway?.baseURL
  }

  async start(): Promise<void> {
    if (this.stopped) throw new Error('RendCore backend attempt was stopped')
    this.preparation = this.prepare()
    const patch = await this.preparation
    if (this.stopped) return
    this.host = this.options.createHost(patch)
    await this.host.start()
  }

  stop(): Promise<void> {
    this.stopped = true
    this.stopping ??= (async () => {
      await this.preparation?.catch(() => undefined)
      try { await this.host?.stop() } finally {
        const gateway = this.gateway
        this.gateway = undefined
        await gateway?.close()
      }
    })()
    return this.stopping
  }

  private async prepare(): Promise<string> {
    const { dshHome, profile, productPatch, enableRendCore = true, log } = this.options
    if (!enableRendCore) return productPatch
    await migrateRendCoreEndpoints(dshHome, profile)
    this.gateway = await startRendCoreGateway({
      log,
      preferredEndpoint: () => this.options.upstreams?.preferredEndpoint,
      onSelected: endpoint => this.options.upstreams?.recordSelected(endpoint)
    })
    const catalog = await prepareRendCoreModelCatalog(productPatch, dshHome, log, this.gateway.baseURL, {
      preferredEndpoint: this.options.upstreams?.preferredEndpoint
    })
    return catalog.path
  }
}
