import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import {
  configuredStoreDir,
  ensureStoreDirPinned,
  pinStoreDir,
  recordedStoreDir,
  storeDirSetting
} from '../src/main/state/profile-store'

describe('profile pnpm store pinning', () => {
  it('parses and pins the store recorded by pnpm', async () => {
    expect(recordedStoreDir).toBeTypeOf('function')
    expect(configuredStoreDir('shared-workspace=true\nstore-dir=C:\\store')).toBe('C:\\store')
    expect(storeDirSetting('C:\\store\\v10')).toBe('C:\\store')
    expect(pinStoreDir('shared-workspace=true\n', 'C:\\store')).toBe(
      'shared-workspace=true\nstore-dir=C:\\store\n'
    )

    const root = await mkdtemp(join(tmpdir(), 'rendcore-profile-store-'))
    const profile = join(root, 'profiles', 'web')
    await mkdir(join(profile, 'node_modules'), { recursive: true })
    await writeFile(
      join(profile, 'node_modules', '.modules.yaml'),
      'storeDir: C:\\store\\v10\n',
      'utf8'
    )
    const dshHome = root
    expect(await ensureStoreDirPinned(dshHome)).toBe('C:\\store')
    expect(await readFile(join(profile, '.npmrc'), 'utf8')).toBe('store-dir=C:\\store\n')
  })
})
