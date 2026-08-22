import { describe, expect, it } from 'vitest'
import { bundleEntryIds, prunePatchLayer } from '../src/main/state/patch-layer'

describe('plugin patch-layer cleanup', () => {
  it('finds declared loader ids and removes only the uninstalled plugin rows', () => {
    const bundlePatch = `
- insert:
    - id: modsearch
      name: '@liustack/modsearch'
- insert:
    - id: unrelated
      name: '@example/other'
`
    expect(bundleEntryIds(bundlePatch)).toEqual(['modsearch', 'unrelated'])

    const userPatch = `# keep this header
- id: modsearch
  config:
    searchProvider: modsearch
- insert:
    - name: '@liustack/modsearch'
    - name: '@example/other'
`
    const result = prunePatchLayer(userPatch, '@liustack/modsearch', ['modsearch'])
    expect(result.removed).toEqual(['id: modsearch', 'insert: @liustack/modsearch'])
    expect(result.text).toContain("name: '@example/other'")
    expect(result.text).not.toContain('searchProvider: modsearch')
    expect(result.text).toContain('# keep this header')
  })

  it('leaves malformed or unrelated patch layers untouched', () => {
    expect(prunePatchLayer('not: [valid', 'plugin', ['entry'])).toEqual({
      text: 'not: [valid',
      removed: []
    })
    const text = '- id: other\n  config: true\n'
    expect(prunePatchLayer(text, 'plugin', ['entry'])).toEqual({ text, removed: [] })
  })
})
