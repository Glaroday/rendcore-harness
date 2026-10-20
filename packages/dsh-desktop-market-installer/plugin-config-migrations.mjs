import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * dsh-pet 0.2.2 made pets[].display mandatory. Older user configs predate
 * that field, so preserve their settings and make the former behaviour
 * explicit before the plugin is mounted.
 */
export async function migrateDshPetDisplayConfig(home, note) {
  const configPath = join(home, 'dsh-pet', 'main-config.json')
  try {
    const source = await readFile(configPath, 'utf8')
    const config = JSON.parse(source)
    if (!config || typeof config !== 'object' || !Array.isArray(config.pets)) return false

    let changed = false
    for (const pet of config.pets) {
      if (!pet || typeof pet !== 'object' || Array.isArray(pet)) continue
      if (pet.display === undefined) {
        pet.display = 'both'
        changed = true
      }
    }
    if (!changed) return false

    await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
    note?.('migrated legacy dsh-pet config: missing display -> both')
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    const message = error instanceof Error ? error.message : String(error)
    note?.(`could not migrate legacy dsh-pet config: ${message}`)
    return false
  }
}

export async function migrateInstalledPluginConfig(home, pluginName, note) {
  if (pluginName !== 'dsh-pet') return false
  return migrateDshPetDisplayConfig(home, note)
}
