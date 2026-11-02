import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { migrateRendCoreEndpoints, removeManagedEndpointOverrides } from '../src/main/runtime/rendcore-endpoint-migration'

describe('RendCore endpoint override migration', () => {
  it('removes stale native and legacy overrides while retaining keys, models, comments and other providers', () => {
    const source = '- id: llm-pi-ai\n  config:\n    providers:\n      rendcore:\n        # keep me\n        baseURL: http://43.248.102.104:18704/v1\n        apiKeyEnv: RENDCORE_API_KEY\n        models: [{id: custom}]\n      other:\n        baseURL: http://43.248.102.104:18704/v1\n'
    const result = removeManagedEndpointOverrides(source)
    expect(result.match(/baseURL:/g)).toHaveLength(1)
    expect(result).toContain('# keep me')
    expect(result).toContain('apiKeyEnv: RENDCORE_API_KEY')
    expect(result).toContain('id: custom')
    expect(removeManagedEndpointOverrides(result)).toBe(result)
    expect(removeManagedEndpointOverrides('llm-pi-ai:\n  providers:\n    rendcore:\n      baseURL: http://47.103.24.134:18036/v1\n')).not.toContain('baseURL')
  })

  it('preserves genuinely custom endpoints and dynamic expressions', () => {
    for (const value of ['https://custom.example/v1', '!!js process.env.CUSTOM_ENDPOINT']) {
      const source = `- id: llm-pi-ai\n  config:\n    providers:\n      rendcore:\n        baseURL: ${value}\n`
      expect(removeManagedEndpointOverrides(source)).toBe(source)
    }
  })

  it('leaves malformed YAML for the existing startup recovery validator', () => {
    const malformed = '- id: llm-pi-ai\n  config: [broken\n'
    expect(removeManagedEndpointOverrides(malformed)).toBe(malformed)
  })

  it('clears a saved prior-launch bridge and backs up both layers exactly once', async () => {
    const home = await mkdtemp(join(tmpdir(), 'rc-endpoint-migration-'))
    try {
      await mkdir(join(home, 'profiles/web'), { recursive: true })
      const source = `- id: llm-pi-ai\n  config:\n    providers:\n      rendcore:\n        baseURL: http://127.0.0.1:1234/rendcore-${'a'.repeat(48)}/v1\n`
      const file = join(home, 'profiles/web/cordis.patch.yml')
      await writeFile(file, source)
      await migrateRendCoreEndpoints(home, 'web')
      expect(await readFile(file, 'utf8')).not.toContain('baseURL')
      expect(await readFile(`${file}.before-endpoint-failover`, 'utf8')).toBe(source)
      await migrateRendCoreEndpoints(home, 'web')
      expect(await readFile(`${file}.before-endpoint-failover`, 'utf8')).toBe(source)
    } finally { await rm(home, { recursive: true, force: true }) }
  })
})
