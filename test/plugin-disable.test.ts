import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse } from 'yaml'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  disablePatchRows,
  disableProfilePlugin,
  enablePatchRows,
  enableProfilePlugin,
  forgetMarketDisable,
  listDisabledProfilePlugins,
  patchLayerDisabledRows,
  reconcileMarketBundleSwitches
} from '../src/main/state/plugin-disable'

const TEMPLATE = `# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries.
[]
`

describe('patch layer disable rows', () => {
  it('comments out the template placeholder and appends in the market shape', () => {
    const result = disablePatchRows(TEMPLATE, ['proxy-routing'])
    expect(result).toEqual({
      changed: true,
      text: TEMPLATE.replace('[]\n', '# []\n') + '- id: proxy-routing\n  disabled: true\n'
    })
    expect(parse((result as { text: string }).text)).toEqual([{ id: 'proxy-routing', disabled: true }])
  })

  it('is idempotent and flips a force-enabled row in place', () => {
    const layer = '- id: reverse-skill\n  disabled: true\n- id: proxy-routing\n  disabled: false\n- id: storage\n  config:\n    backend: sqlite\n'
    const result = disablePatchRows(layer, ['reverse-skill', 'proxy-routing'])
    expect(result).toEqual({
      changed: true,
      text: '- id: reverse-skill\n  disabled: true\n- id: proxy-routing\n  disabled: true\n- id: storage\n  config:\n    backend: sqlite\n'
    })
    expect(disablePatchRows((result as { text: string }).text, ['proxy-routing'])).toMatchObject({ changed: false })
  })

  it('refuses layers it would make worse and ids the market would not write', () => {
    expect(disablePatchRows('- id: a\n  config: [1\n', ['b'])).toHaveProperty('error')
    expect(disablePatchRows('[{ id: a }]\n', ['b'])).toHaveProperty('error')
    expect(disablePatchRows('', ['bad id'])).toHaveProperty('error')
  })

  it('re-enables by dropping the block and restores the placeholder when nothing is left', () => {
    const disabled = (disablePatchRows(TEMPLATE, ['proxy-routing']) as { text: string }).text
    expect(patchLayerDisabledRows(disabled)).toEqual(['proxy-routing'])
    expect(enablePatchRows(disabled, ['proxy-routing'])).toEqual({ changed: true, text: TEMPLATE })
    expect(enablePatchRows(TEMPLATE, ['proxy-routing'])).toEqual({ changed: false, text: TEMPLATE })
  })
})

describe('profile plugin disable', () => {
  const root = join(__dirname, '.temp-plugin-disable')
  const dshHome = join(root, 'dsh-home')
  const profile = join(dshHome, 'profiles', 'web')
  const patchPath = join(profile, 'cordis.patch.yml')
  const statePath = join(profile, '.dsh-market', 'state.json')

  /** The profile manifest, whose `dsh.profile.bundles` decides what the loader prepares. */
  async function writeProfileManifest(bundles: string[] = []): Promise<void> {
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      name: 'dsh-profile-web',
      dependencies: {},
      ...(bundles.length === 0 ? {} : { dsh: { profile: { bundles } } })
    }))
  }

  async function plugin(name: string, patch?: string): Promise<void> {
    const directory = join(profile, 'node_modules', name)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'package.json'), JSON.stringify({
      name,
      version: '1.0.0',
      ...(patch === undefined ? {} : { dsh: { bundle: { patch: './cordis.patch.yml' } } })
    }))
    if (patch !== undefined) await writeFile(join(directory, 'cordis.patch.yml'), patch)
  }

  beforeEach(async () => {
    await mkdir(join(profile, '.dsh-market'), { recursive: true })
    await writeProfileManifest()
    await writeFile(patchPath, `${TEMPLATE.replace('[]\n', '')}- id: mcp-coaligne\n  disabled: false\n`)
    await writeFile(statePath, JSON.stringify({ disabled: ['@dhicoc/dsh-reverse-skill'], region: 'china', regionAuto: true }))
    await plugin('dsh-proxy-routing', "- insert:\n    - id: proxy-routing\n      name: 'dsh-proxy-routing'\n")
    await plugin('dsh-client-only')
    await plugin('dsh-postgres-backends', '- insert:\n    - id: postgres\n      name: dsh-postgres-backends\n- id: session-persistence-jsonl\n  disabled: true\n')
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('switches a bundle by package without modifying a shared row', async () => {
    const beforePatch = await readFile(patchPath, 'utf8')
    expect(await disableProfilePlugin(dshHome, 'dsh-proxy-routing')).toEqual({ ok: true, rows: ['proxy-routing'] })
    expect(await readFile(patchPath, 'utf8')).toBe(beforePatch)
    expect(JSON.parse(await readFile(statePath, 'utf8'))).toEqual({
      disabled: ['@dhicoc/dsh-reverse-skill', 'dsh-proxy-routing'],
      region: 'china',
      regionAuto: true
    })
    expect(await listDisabledProfilePlugins(dshHome, ['dsh-proxy-routing', 'dsh-client-only'])).toEqual(['dsh-proxy-routing'])

    expect(await enableProfilePlugin(dshHome, 'dsh-proxy-routing')).toEqual({ ok: true })
    expect(await readFile(patchPath, 'utf8')).toBe(beforePatch)
    expect(JSON.parse(await readFile(statePath, 'utf8')).disabled).toEqual(['@dhicoc/dsh-reverse-skill'])
    expect(await listDisabledProfilePlugins(dshHome, ['dsh-proxy-routing'])).toEqual([])
  })

  it('removes a forced enable for the disabled package without touching other rows', async () => {
    await writeFile(patchPath, '- id: mcp-coaligne\n  disabled: false\n- id: proxy-routing\n  disabled: false\n')
    expect(await disableProfilePlugin(dshHome, 'dsh-proxy-routing')).toEqual({ ok: true, rows: ['proxy-routing'] })
    expect(parse(await readFile(patchPath, 'utf8'))).toEqual([{ id: 'mcp-coaligne', disabled: false }])
    expect(await listDisabledProfilePlugins(dshHome, ['dsh-proxy-routing'])).toEqual(['dsh-proxy-routing'])

    // dshmarket clears its disabled flag on boot when the package still
    // has a `disabled: false` patch row. The remaining row belongs elsewhere.
    const userRows = parse(await readFile(patchPath, 'utf8')) as { id: string; disabled: boolean }[]
    expect(userRows.some((row) => row.id === 'proxy-routing' && row.disabled === false)).toBe(false)
  })

  it('restores a forced enable when the market state cannot be written', async () => {
    const layer = '- id: proxy-routing\n  disabled: false\n'
    await writeFile(patchPath, layer)
    await writeFile(statePath, '{ not json')
    expect(await disableProfilePlugin(dshHome, 'dsh-proxy-routing')).toMatchObject({ ok: false, reason: 'market-state' })
    expect(await readFile(patchPath, 'utf8')).toBe(layer)
  })

  it('switches a client-only plugin off through the market state alone', async () => {
    const before = await readFile(patchPath, 'utf8')
    expect(await disableProfilePlugin(dshHome, 'dsh-client-only')).toEqual({ ok: true, rows: [] })
    expect(await readFile(patchPath, 'utf8')).toBe(before)
    expect(await listDisabledProfilePlugins(dshHome, ['dsh-client-only'])).toEqual(['dsh-client-only'])
  })

  it('can disable a listed bundle whose patch is unreadable', async () => {
    await writeProfileManifest(['dsh-broken-bundle'])
    await plugin('dsh-broken-bundle', '- insert:\n    - id: broken\n      name: dsh-broken-bundle\n')
    await rm(join(profile, 'node_modules', 'dsh-broken-bundle', 'cordis.patch.yml'))
    const before = await readFile(patchPath, 'utf8')

    expect(await disableProfilePlugin(dshHome, 'dsh-broken-bundle')).toEqual({ ok: true, rows: [] })
    expect(await readFile(patchPath, 'utf8')).toBe(before)
    expect(await listDisabledProfilePlugins(dshHome, ['dsh-broken-bundle'])).toEqual(['dsh-broken-bundle'])
  })

  it('still switches a client-only plugin off through the market state when the profile lists bundles', async () => {
    await writeProfileManifest(['dsh-proxy-routing'])
    expect(await disableProfilePlugin(dshHome, 'dsh-client-only')).toEqual({ ok: true, rows: [] })
    expect(await listDisabledProfilePlugins(dshHome, ['dsh-client-only'])).toEqual(['dsh-client-only'])
  })

  it('refuses a disable-carrier, whose own rows alone would strand the plugin it replaces', async () => {
    const before = await readFile(patchPath, 'utf8')
    expect(await disableProfilePlugin(dshHome, 'dsh-postgres-backends')).toMatchObject({
      ok: false,
      reason: 'carrier',
      foreignDisables: ['session-persistence-jsonl']
    })
    expect(await readFile(patchPath, 'utf8')).toBe(before)
  })

  it('forgets the market disable of a removed plugin, keeping the rest of the state', async () => {
    await disableProfilePlugin(dshHome, 'dsh-proxy-routing')
    await forgetMarketDisable(dshHome, 'dsh-proxy-routing')
    expect(JSON.parse(await readFile(statePath, 'utf8'))).toEqual({
      disabled: ['@dhicoc/dsh-reverse-skill'],
      region: 'china',
      regionAuto: true
    })
  })

  it('never overwrites an unreadable market state', async () => {
    await writeFile(statePath, '{ not json')
    expect(await disableProfilePlugin(dshHome, 'dsh-proxy-routing')).toMatchObject({ ok: false, reason: 'market-state' })
    expect(await disableProfilePlugin(dshHome, 'dsh-client-only')).toMatchObject({ ok: false, reason: 'market-state' })
    expect(await readFile(statePath, 'utf8')).toBe('{ not json')
  })
})

describe('market bundle switch reconciliation', () => {
  const root = join(__dirname, '.temp-market-bundle-switch')
  const dshHome = join(root, 'dsh-home')
  const profile = join(dshHome, 'profiles', 'web')
  const patchPath = join(profile, 'cordis.patch.yml')
  const statePath = join(profile, '.dsh-market', 'state.json')

  async function writeProfileManifest(bundles: string[]): Promise<void> {
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      name: 'dsh-profile-web',
      dependencies: {},
      ...(bundles.length === 0 ? {} : { dsh: { profile: { bundles } } })
    }))
  }

  async function plugin(name: string, patch: string): Promise<void> {
    const directory = join(profile, 'node_modules', name)
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'package.json'), JSON.stringify({
      name,
      version: '1.0.0',
      dsh: { bundle: { patch: './cordis.patch.yml' } }
    }))
    await writeFile(join(directory, 'cordis.patch.yml'), patch)
  }

  async function disabledPackages(): Promise<string[]> {
    return (JSON.parse(await readFile(statePath, 'utf8')) as { disabled: string[] }).disabled
  }

  /** The shape dsh-builtin-browser ships: a config row and a !!js expression. */
  const CONFIG_BUNDLE = "- insert:\n    - id: browser\n      name: dsh-browser/browser\n    - id: tool-browser\n      name: dsh-browser/tool-browser\n      config: {}\n"
  const PLAIN_BUNDLE = "- insert:\n    - id: modsearch\n      name: '@liustack/modsearch'\n"

  beforeEach(async () => {
    await mkdir(join(profile, '.dsh-market'), { recursive: true })
    await writeFile(patchPath, `${TEMPLATE.replace('[]\n', '')}- id: mcp-coaligne\n  disabled: false\n`)
    await writeFile(statePath, JSON.stringify({ disabled: [], region: 'china', regionAuto: true }))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('pins a stuck switch onto the rows the profile still composes', async () => {
    await writeProfileManifest(['dsh-browser'])
    await plugin('dsh-browser', CONFIG_BUNDLE)
    await writeFile(statePath, JSON.stringify({ disabled: ['dsh-browser'], region: 'china', regionAuto: true }))

    expect(await reconcileMarketBundleSwitches(dshHome)).toEqual([
      { name: 'dsh-browser', rows: ['browser', 'tool-browser'] }
    ])
    expect(await disabledPackages()).toEqual([])
    expect(parse(await readFile(patchPath, 'utf8'))).toEqual([
      { id: 'mcp-coaligne', disabled: false },
      { id: 'browser', disabled: true },
      { id: 'tool-browser', disabled: true }
    ])
    // The switch is off in exactly one layer now, and the row layer is the one
    // the market's own enable path flips.
    expect(await reconcileMarketBundleSwitches(dshHome)).toEqual([])
  })

  it('leaves a pure-insert bundle to the market, which hot-mounts it', async () => {
    await writeProfileManifest(['@liustack/modsearch'])
    await plugin('@liustack/modsearch', PLAIN_BUNDLE)
    await writeFile(statePath, JSON.stringify({ disabled: ['@liustack/modsearch'] }))
    const before = await readFile(patchPath, 'utf8')

    expect(await reconcileMarketBundleSwitches(dshHome)).toEqual([])
    expect(await disabledPackages()).toEqual(['@liustack/modsearch'])
    expect(await readFile(patchPath, 'utf8')).toBe(before)
  })

  it('leaves a switch the profile no longer declares alone', async () => {
    await writeProfileManifest([])
    await plugin('dsh-browser', CONFIG_BUNDLE)
    await writeFile(statePath, JSON.stringify({ disabled: ['dsh-browser'] }))
    const before = await readFile(patchPath, 'utf8')

    expect(await reconcileMarketBundleSwitches(dshHome)).toEqual([])
    expect(await disabledPackages()).toEqual(['dsh-browser'])
    expect(await readFile(patchPath, 'utf8')).toBe(before)
  })

  it('refuses a disable-carrier, whose patch speaks for another plugin', async () => {
    await writeProfileManifest(['dsh-carrier'])
    await plugin('dsh-carrier', `${PLAIN_BUNDLE}- id: session-persistence-jsonl\n  disabled: true\n`)
    await writeFile(statePath, JSON.stringify({ disabled: ['dsh-carrier'] }))
    const before = await readFile(patchPath, 'utf8')

    expect(await reconcileMarketBundleSwitches(dshHome)).toEqual([])
    expect(await disabledPackages()).toEqual(['dsh-carrier'])
    expect(await readFile(patchPath, 'utf8')).toBe(before)
  })

  it('leaves an unreadable bundle patch alone', async () => {
    await writeProfileManifest(['dsh-broken-bundle'])
    await plugin('dsh-broken-bundle', PLAIN_BUNDLE)
    await rm(join(profile, 'node_modules', 'dsh-broken-bundle', 'cordis.patch.yml'))
    await writeFile(statePath, JSON.stringify({ disabled: ['dsh-broken-bundle'] }))

    expect(await reconcileMarketBundleSwitches(dshHome)).toEqual([])
    expect(await disabledPackages()).toEqual(['dsh-broken-bundle'])
  })
})
