import { lstat, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { removeTree } from './remove-tree'

interface PackageManifest {
  name?: unknown
  dsh?: {
    moduleFallback?: {
      targets?: unknown
    }
  }
}

async function readManifest(path: string): Promise<PackageManifest | undefined> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as PackageManifest
  } catch {
    return undefined
  }
}

async function isLegacyCollision(
  profilePackage: string,
  installationPackage: string,
  packageName: string
): Promise<boolean> {
  try {
    const stat = await lstat(profilePackage)
    if (!stat.isDirectory() || stat.isSymbolicLink()) return false
  } catch {
    return false
  }

  const [profileManifest, installationManifest] = await Promise.all([
    readManifest(join(profilePackage, 'package.json')),
    readManifest(join(installationPackage, 'package.json'))
  ])
  if (profileManifest?.name !== packageName || installationManifest?.name !== packageName) {
    return false
  }

  return profileManifest.dsh?.moduleFallback?.targets === undefined
}

/**
 * Remove physical packages left in the shared fallback directory by older
 * RendCore builds. Harness 0.1.2 owns this directory and replaces installation
 * dependencies with junctions (or packaged proxies), while user plugins live
 * in a profile or generation and are therefore outside this migration.
 */
export async function clearLegacyModuleFallbackConflicts(options: {
  dshHome: string
  installationNodeModules: string
  note?: (message: string) => void
}): Promise<string[]> {
  const sharedModules = join(options.dshHome, 'profiles', 'node_modules')
  let entries
  try {
    entries = await readdir(sharedModules, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }

  const candidates: Array<{ name: string; path: string; installationPath: string }> = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue
    if (!entry.name.startsWith('@')) {
      candidates.push({
        name: entry.name,
        path: join(sharedModules, entry.name),
        installationPath: join(options.installationNodeModules, entry.name)
      })
      continue
    }

    const scopePath = join(sharedModules, entry.name)
    for (const child of await readdir(scopePath, { withFileTypes: true })) {
      if (!child.isDirectory() || child.isSymbolicLink()) continue
      candidates.push({
        name: `${entry.name}/${child.name}`,
        path: join(scopePath, child.name),
        installationPath: join(options.installationNodeModules, entry.name, child.name)
      })
    }
  }

  const removed: string[] = []
  for (const candidate of candidates) {
    if (!(await isLegacyCollision(candidate.path, candidate.installationPath, candidate.name))) {
      continue
    }
    await removeTree(candidate.path)
    removed.push(candidate.name)
    options.note?.(`[desktop] removed legacy module fallback conflict: ${candidate.name}`)
  }
  return removed
}
