import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'yaml'
import { afterEach, describe, expect, it } from 'vitest'
import { migrateLegacyPresetSetting } from '../src/main/state/preset-migration'

describe('legacy agent preset migration', () => {
  const roots: string[] = []

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  it('renames the removed code default to ptc without changing other settings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rendcore-preset-migration-'))
    roots.push(root)
    await mkdir(root, { recursive: true })
    await writeFile(join(root, 'settings.yaml'), 'theme: dark\nagent-presets:\n  default: code\n')
    const notes: string[] = []

    await expect(migrateLegacyPresetSetting(root, (line) => notes.push(line))).resolves.toBe(true)

    const settings = parse(await readFile(join(root, 'settings.yaml'), 'utf8'))
    expect(settings).toEqual({ theme: 'dark', 'agent-presets': { default: 'ptc' } })
    expect(notes).toEqual(['[desktop] migrated legacy agent preset default: code -> ptc'])
  })

  it('leaves current and missing settings unchanged', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rendcore-preset-migration-'))
    roots.push(root)
    await writeFile(join(root, 'settings.yaml'), 'agent-presets:\n  default: standard\n')

    await expect(migrateLegacyPresetSetting(root)).resolves.toBe(false)
    await expect(migrateLegacyPresetSetting(join(root, 'missing'))).resolves.toBe(false)
  })
})
