import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { profilePackageJsonPath } from './plugin-recovery'

/** Read the store path pnpm recorded for the profile's node_modules. */
export async function recordedStoreDir(profileDirectory: string): Promise<string | undefined> {
  try {
    const raw = await readFile(join(profileDirectory, 'node_modules', '.modules.yaml'), 'utf8')
    const quoted = /^\s*"?storeDir"?\s*:\s*"([^"]+)"/mu.exec(raw)
    const bare = /^\s*"?storeDir"?\s*:\s*([^"\s][^,\n]*?)\s*,?\s*$/mu.exec(raw)
    const value = (quoted?.[1] ?? bare?.[1])?.trim()
    return value || undefined
  } catch {
    return undefined
  }
}

export function configuredStoreDir(npmrc: string): string | undefined {
  const match = /^\s*store-dir\s*=\s*(.+?)\s*$/mu.exec(npmrc)
  return match?.[1] || undefined
}

export function pinStoreDir(npmrc: string, storeDir: string): string | undefined {
  if (configuredStoreDir(npmrc) === storeDir) return undefined
  const body = configuredStoreDir(npmrc) === undefined
    ? npmrc
    : npmrc.replace(/^\s*store-dir\s*=.*$\n?/mu, '')
  const separator = body.length === 0 || body.endsWith('\n') ? '' : '\n'
  return `${body}${separator}store-dir=${storeDir}\n`
}

/** pnpm records a version suffix in .modules.yaml but .npmrc does not. */
export function storeDirSetting(recorded: string): string {
  return /[/\\]v\d+$/u.test(recorded) ? dirname(recorded) : recorded
}

/** Pin the profile to the store that already materialized its node_modules. */
export async function ensureStoreDirPinned(dshHome: string): Promise<string | undefined> {
  const profileDirectory = dirname(profilePackageJsonPath(dshHome))
  const recorded = await recordedStoreDir(profileDirectory)
  if (recorded === undefined) return undefined

  const npmrcPath = join(profileDirectory, '.npmrc')
  let npmrc = ''
  try {
    npmrc = await readFile(npmrcPath, 'utf8')
  } catch {
    // A profile without .npmrc still deserves the pin.
  }
  const expected = storeDirSetting(recorded)
  const pinned = pinStoreDir(npmrc, expected)
  if (pinned === undefined) return undefined
  try {
    await writeFile(npmrcPath, pinned, 'utf8')
    return expected
  } catch {
    return undefined
  }
}

export async function inspectStoreConsistency(dshHome: string): Promise<string | undefined> {
  const profileDirectory = dirname(profilePackageJsonPath(dshHome))
  const recorded = await recordedStoreDir(profileDirectory)
  if (recorded === undefined) return undefined

  let npmrc = ''
  try {
    npmrc = await readFile(join(profileDirectory, '.npmrc'), 'utf8')
  } catch {
    // No .npmrc means no configured store.
  }
  const configured = configuredStoreDir(npmrc)
  const expected = storeDirSetting(recorded)
  if (configured === expected) return undefined
  return configured === undefined
    ? `node_modules was linked from ${recorded}, but no .npmrc pins it`
    : `node_modules was linked from ${recorded}, but .npmrc pins ${configured}`
}
