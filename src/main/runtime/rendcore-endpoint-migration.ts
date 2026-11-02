import { constants } from 'node:fs'
import { copyFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isMap, isScalar, isSeq, parseDocument } from 'yaml'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { RENDCORE_API_ENDPOINTS } from './rendcore-gateway'

function managedEndpoint(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const normalized = value.replace(/\/+$/, '')
  return ['http://43.248.102.104:18704/v1', 'http://47.103.24.134:18036/v1',
    ...RENDCORE_API_ENDPOINTS].includes(normalized) ||
    /^http:\/\/127\.0\.0\.1:\d+\/rendcore-[a-f0-9]{48}\/v1$/.test(normalized)
}

/** Remove only obsolete product-owned overrides. The launch overlay supplies
 * the current bridge address; never persist a random loopback port in user settings.
 * YAML AST editing preserves expressions, comments and unrelated providers.
 */
export function removeManagedEndpointOverrides(source: string): string {
  const document = parseDocument(source, { logLevel: 'silent' })
  // Existing startup inspection owns malformed-YAML diagnostics and recovery.
  if (document.errors.length) return source
  let changed = false
  function providers(config: unknown): void {
    if (!isMap(config)) return
    const entries = config.get('providers', true)
    if (!isMap(entries)) return
    const rendcore = entries.get('rendcore', true)
    if (!isMap(rendcore)) return
    const endpoint = rendcore.get('baseURL', true)
    if (isScalar(endpoint) && !endpoint.tag && managedEndpoint(endpoint.value)) {
      rendcore.delete('baseURL')
      changed = true
    }
  }
  function visit(node: unknown): void {
    if (isSeq(node)) node.items.forEach(visit)
    else if (isMap(node)) {
      if (node.get('id') === 'llm-pi-ai' || node.get('name') === '@deepseek-ai/dsh-llm-pi-ai') {
        providers(node.get('config', true))
      }
      providers(node.get('llm-pi-ai', true))
      node.items.forEach(pair => visit(pair.value))
    }
  }
  visit(document.contents)
  return changed ? String(document) : source
}

export async function migrateRendCoreEndpoints(dshHome: string, profile: string): Promise<void> {
  for (const path of [
    join(dshHome, 'settings.yaml'), join(dshHome, 'cordis.patch.yml'),
    join(dshHome, 'profiles', profile, 'cordis.patch.yml'),
    join(dshHome, 'profiles', profile, 'settings.yaml')
  ]) {
    let source: string
    try { source = await readFile(path, 'utf8') } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw error
    }
    const next = removeManagedEndpointOverrides(source)
    if (next === source) continue
    try { await copyFile(path, `${path}.before-endpoint-failover`, constants.COPYFILE_EXCL) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
    await writeFileAtomic(path, next, { mode: 0o600 })
  }
}
