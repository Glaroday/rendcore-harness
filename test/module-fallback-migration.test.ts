import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { clearLegacyModuleFallbackConflicts } from '../src/main/state/module-fallback-migration'

describe('module fallback migration', () => {
  const roots: string[] = []

  async function packageAt(root: string, name: string, extra: object = {}): Promise<string> {
    const path = join(root, ...name.split('/'))
    await mkdir(path, { recursive: true })
    await writeFile(join(path, 'package.json'), JSON.stringify({ name, version: '1.0.0', ...extra }))
    return path
  }

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  it('removes only physical installation packages left in the shared fallback', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rendcore-module-fallback-'))
    roots.push(root)
    const home = join(root, 'home')
    const shared = join(home, 'profiles', 'node_modules')
    const installed = join(root, 'app', 'node_modules')

    for (const name of ['dsh-model-fix', '@liustack/modsearch', 'undici', 'linked-package']) {
      await packageAt(installed, name)
    }
    await packageAt(shared, 'dsh-model-fix')
    await packageAt(shared, '@liustack/modsearch')
    await packageAt(shared, 'undici')
    await packageAt(shared, 'user-plugin')
    await packageAt(shared, 'managed-proxy', {
      dsh: { moduleFallback: { targets: { '.': 'file:///managed.js' } } }
    })
    const linkedTarget = await packageAt(join(root, 'target'), 'linked-package')
    await symlink(
      linkedTarget,
      join(shared, 'linked-package'),
      process.platform === 'win32' ? 'junction' : 'dir'
    )

    const notes: string[] = []
    const removed = await clearLegacyModuleFallbackConflicts({
      dshHome: home,
      installationNodeModules: installed,
      note: (line) => notes.push(line)
    })

    expect(removed.sort()).toEqual(['@liustack/modsearch', 'dsh-model-fix', 'undici'])
    expect(existsSync(join(shared, 'dsh-model-fix'))).toBe(false)
    expect(existsSync(join(shared, '@liustack', 'modsearch'))).toBe(false)
    expect(existsSync(join(shared, 'undici'))).toBe(false)
    expect(existsSync(join(shared, 'user-plugin'))).toBe(true)
    expect(existsSync(join(shared, 'managed-proxy'))).toBe(true)
    expect(existsSync(join(shared, 'linked-package'))).toBe(true)
    expect(notes).toHaveLength(3)
  })

  it('is a no-op before the shared fallback exists', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rendcore-module-fallback-empty-'))
    roots.push(root)
    await expect(
      clearLegacyModuleFallbackConflicts({
        dshHome: join(root, 'home'),
        installationNodeModules: join(root, 'app', 'node_modules')
      })
    ).resolves.toEqual([])
  })
})
