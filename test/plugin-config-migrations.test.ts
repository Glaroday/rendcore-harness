import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  migrateDshPetDisplayConfig,
  migrateInstalledPluginConfig
} from 'dsh-desktop-market-installer/plugin-config-migrations'

describe('community plugin config migrations', () => {
  const roots: string[] = []

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  async function makeHome(config: unknown): Promise<{ root: string; path: string }> {
    const root = await mkdtemp(join(tmpdir(), 'rendcore-plugin-config-'))
    roots.push(root)
    const directory = join(root, 'dsh-pet')
    const path = join(directory, 'main-config.json')
    await mkdir(directory, { recursive: true })
    await writeFile(path, JSON.stringify(config, null, 2), 'utf8')
    return { root, path }
  }

  it('adds display=both to legacy pets without changing the rest of their settings', async () => {
    const { root, path } = await makeHome({
      notificationsEnabled: false,
      pets: [
        {
          id: 'main',
          size: 462,
          balanceEnabled: true,
          position: { corner: 'top-right', marginX: 24, marginY: 100 }
        },
        {
          id: 'second',
          size: 300,
          balanceEnabled: false,
          display: 'web',
          position: { corner: 'bottom-left', marginX: 8, marginY: 12 }
        }
      ]
    })
    const notes: string[] = []

    await expect(migrateDshPetDisplayConfig(root, (line) => notes.push(line))).resolves.toBe(true)

    const migrated = JSON.parse(await readFile(path, 'utf8'))
    expect(migrated.notificationsEnabled).toBe(false)
    expect(migrated.pets[0]).toMatchObject({ id: 'main', size: 462, display: 'both' })
    expect(migrated.pets[1]).toMatchObject({ id: 'second', display: 'web' })
    expect(notes).toEqual(['migrated legacy dsh-pet config: missing display -> both'])
  })

  it('is idempotent and ignores unrelated plugin installs', async () => {
    const { root, path } = await makeHome({ pets: [{ id: 'main', display: 'desktop' }] })
    const before = await readFile(path, 'utf8')

    await expect(migrateDshPetDisplayConfig(root)).resolves.toBe(false)
    await expect(migrateInstalledPluginConfig(root, 'dsh-pet')).resolves.toBe(false)
    await expect(migrateInstalledPluginConfig(root, '@liustack/modsearch')).resolves.toBe(false)
    expect(await readFile(path, 'utf8')).toBe(before)
  })

  it('leaves missing and malformed files untouched without blocking startup', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rendcore-plugin-config-'))
    roots.push(root)

    await expect(migrateDshPetDisplayConfig(root)).resolves.toBe(false)
    await mkdir(join(root, 'dsh-pet'), { recursive: true })
    await writeFile(join(root, 'dsh-pet', 'main-config.json'), '{not-json', 'utf8')
    const notes: string[] = []
    await expect(migrateDshPetDisplayConfig(root, (line) => notes.push(line))).resolves.toBe(false)
    expect(notes[0]).toContain('could not migrate legacy dsh-pet config')
    expect(await readFile(join(root, 'dsh-pet', 'main-config.json'), 'utf8')).toBe('{not-json')
  })
})
