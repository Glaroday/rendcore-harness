import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parse, stringify } from 'yaml'

/**
 * DSH 0.1.2 renamed the old PTC preset from `code` to `ptc`. Update the
 * writable default while the Harness process is stopped. Durable session
 * headers are intentionally left untouched and handled by the resolver alias.
 */
export async function migrateLegacyPresetSetting(
  dshHome: string,
  note?: (message: string) => void
): Promise<boolean> {
  const settingsPath = join(dshHome, 'settings.yaml')
  if (!existsSync(settingsPath)) return false

  try {
    const source = await readFile(settingsPath, 'utf8')
    const settings = parse(source) as Record<string, unknown> | null
    const presets = settings?.['agent-presets']
    if (!presets || typeof presets !== 'object' || Array.isArray(presets)) return false
    if ((presets as Record<string, unknown>).default !== 'code') return false

    ;(presets as Record<string, unknown>).default = 'ptc'
    await writeFile(settingsPath, stringify(settings), 'utf8')
    note?.('[desktop] migrated legacy agent preset default: code -> ptc')
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    note?.(`[desktop] could not migrate legacy agent preset setting: ${message}`)
    return false
  }
}
