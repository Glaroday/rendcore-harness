import { isMap, isSeq, parseDocument } from 'yaml'

/** Remove only patch-layer rows that target an uninstalled plugin. */
export interface PatchLayerPrune {
  text: string
  removed: string[]
}

/** Loader entry ids declared by a bundle's `insert` rows. */
export function bundleEntryIds(patchText: string): string[] {
  let document
  try {
    document = parseDocument(patchText)
  } catch {
    return []
  }
  const contents = document.contents
  if (!isSeq(contents)) return []

  const ids: string[] = []
  for (const row of contents.items) {
    if (!isMap(row)) continue
    const insert = row.get('insert')
    if (!isSeq(insert)) continue
    for (const entry of insert.items) {
      if (!isMap(entry)) continue
      const id = entry.get('id')
      if (typeof id === 'string') ids.push(id)
    }
  }
  return [...new Set(ids)]
}

function belongsToPlugin(value: unknown, plugin: string): boolean {
  return typeof value === 'string' && (value === plugin || value.startsWith(`${plugin}/`))
}

/**
 * Remove rows aimed at a plugin while preserving unrelated rows and comments.
 * This intentionally edits the YAML document instead of reparsing/reprinting
 * the whole file so user-authored formatting survives an uninstall.
 */
export function prunePatchLayer(
  text: string,
  plugin: string,
  entryIds: readonly string[]
): PatchLayerPrune {
  let document
  try {
    document = parseDocument(text)
  } catch {
    return { text, removed: [] }
  }
  const contents = document.contents
  if (!isSeq(contents)) return { text, removed: [] }

  const removed: string[] = []
  const kept = []
  let header: unknown

  for (const [index, row] of contents.items.entries()) {
    if (!isMap(row)) {
      kept.push(row)
      continue
    }

    const id = row.get('id')
    if (typeof id === 'string' && entryIds.includes(id)) {
      removed.push(`id: ${id}`)
      if (index === 0) header = row.commentBefore
      continue
    }

    const insert = row.get('insert')
    if (isSeq(insert)) {
      const survivors = insert.items.filter((entry) => {
        const name = isMap(entry) ? entry.get('name') : undefined
        if (!belongsToPlugin(name, plugin)) return true
        removed.push(`insert: ${String(name)}`)
        return false
      })
      if (survivors.length === 0 && insert.items.length > 0) {
        if (index === 0) header = row.commentBefore
        continue
      }
      insert.items = survivors
    }
    kept.push(row)
  }

  if (removed.length === 0) return { text, removed }
  if (typeof header === 'string') {
    const first = kept[0]
    if (isMap(first)) first.commentBefore = [header, first.commentBefore].filter(Boolean).join('\n')
    else document.commentBefore = header
  }
  contents.items = kept
  return { text: String(document), removed }
}
