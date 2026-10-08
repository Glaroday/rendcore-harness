import { describe, expect, it } from 'vitest'
import {
  archiveFeedUrl,
  compareVersions,
  fetchAvailableReleases,
  parseReleaseIndex,
  versionFeedUrl
} from '../src/main/update/version-catalog'

describe('version-catalog sources', () => {
  it('builds a per-version feed url in this repository, with a trailing slash', () => {
    expect(archiveFeedUrl('1.2.3')).toBe(
      'https://github.com/Glaroday/rendcore-harness/releases/download/v1.2.3/'
    )
    expect(archiveFeedUrl('v1.2.3')).toBe(
      'https://github.com/Glaroday/rendcore-harness/releases/download/v1.2.3/'
    )
  })

  it('rewrites a configured mirror to the requested version', () => {
    const mirrors = [
      'https://gh-proxy.com/https://github.com/Glaroday/rendcore-harness/releases/latest/download/',
      'https://ghfast.top/https://github.com/Glaroday/rendcore-harness/releases/latest/download/'
    ]
    expect(versionFeedUrl('1.2.3', mirrors)).toBe(
      'https://gh-proxy.com/https://github.com/Glaroday/rendcore-harness/releases/download/v1.2.3/'
    )
  })

  it('falls back to this repository when no mirror carries the release path', () => {
    expect(versionFeedUrl('1.2.3', ['https://example.com/whatever/'])).toBe(archiveFeedUrl('1.2.3'))
    expect(versionFeedUrl('1.2.3')).toBe(archiveFeedUrl('1.2.3'))
  })
})

describe('compareVersions', () => {
  it('orders by numeric segments', () => {
    expect(compareVersions('1.2.0', '1.10.0')).toBe(-1)
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1)
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0)
  })

  it('treats a prerelease as lower than its release', () => {
    expect(compareVersions('1.2.3-rc.1', '1.2.3')).toBe(-1)
    expect(compareVersions('1.2.3', '1.2.3-rc.1')).toBe(1)
    expect(compareVersions('1.2.3-rc.1', '1.2.3-rc.2')).toBe(-1)
  })

  it('compares prerelease counters numerically, not lexicographically', () => {
    // "rc.10" < "rc.9" under string comparison; semver says the reverse.
    expect(compareVersions('1.2.3-rc.10', '1.2.3-rc.9')).toBe(1)
    expect(compareVersions('1.2.3-rc.9', '1.2.3-rc.10')).toBe(-1)
    expect(compareVersions('1.2.3-alpha.10', '1.2.3-alpha.9')).toBe(1)
    expect(compareVersions('1.2.3-rc.10', '1.2.3-rc.1')).toBe(1)
  })

  it('follows semver identifier precedence', () => {
    // fewer identifiers < more ("alpha" < "alpha.1")
    expect(compareVersions('1.2.3-alpha', '1.2.3-alpha.1')).toBe(-1)
    // numeric identifiers < alphanumeric ones ("1" < "alpha")
    expect(compareVersions('1.2.3-1', '1.2.3-alpha')).toBe(-1)
    expect(compareVersions('1.2.3-alpha', '1.2.3-beta')).toBe(-1)
    expect(compareVersions('1.2.3-rc.10', '1.2.3-rc.10')).toBe(0)
  })
})

describe('parseReleaseIndex', () => {
  it('keeps published v-tags and drops drafts, junk and non-semver tags', () => {
    const raw = [
      { tag_name: 'v1.2.3' },
      { tag_name: 'v1.1.0', draft: true },
      { tag_name: 'nightly' },
      { tag_name: 'v0.0' },
      'nope',
      42
    ]
    expect(parseReleaseIndex(raw)).toEqual([
      { version: '1.2.3', tag: 'v1.2.3', archiveUrl: archiveFeedUrl('1.2.3') }
    ])
  })

  it('returns an empty array for anything that is not a release list', () => {
    expect(parseReleaseIndex(null)).toEqual([])
    expect(parseReleaseIndex({})).toEqual([])
    expect(parseReleaseIndex('nope')).toEqual([])
  })
})

describe('fetchAvailableReleases', () => {
  const index = [{ tag_name: 'v1.0.0' }, { tag_name: 'v1.2.0' }, { tag_name: 'v1.1.0' }]
  const ok = () =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(index) } as Response)

  it('drops the current version and sorts descending', async () => {
    const releases = await fetchAvailableReleases('1.1.0', ok as unknown as typeof fetch)
    expect(releases.map((r) => r.version)).toEqual(['1.2.0', '1.0.0'])
  })

  it('throws when the request fails', async () => {
    const bad = () => Promise.resolve({ ok: false, status: 503 } as Response)
    await expect(
      fetchAvailableReleases('1.1.0', bad as unknown as typeof fetch)
    ).rejects.toThrow()
  })

  it('throws when the network rejects', async () => {
    const boom = () => Promise.reject(new Error('offline'))
    await expect(
      fetchAvailableReleases('1.1.0', boom as unknown as typeof fetch)
    ).rejects.toThrow('offline')
  })
})
