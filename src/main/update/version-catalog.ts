import type { AvailableRelease } from '../../shared/contracts'

export type { AvailableRelease }

/**
 * RendCore Harness ships from its own GitHub repository, so every update URL
 * below resolves against that repository instead of an upstream domain. The
 * version index is GitHub's release list: this project has no separate
 * versions.json manifest to keep in sync.
 */
export const RELEASE_REPOSITORY = 'Glaroday/rendcore-harness'
export const RELEASE_TAG_PREFIX = 'v'

/** Latest release assets, used when no mirror is configured. */
export const STABLE_FEED_URL = `https://github.com/${RELEASE_REPOSITORY}/releases/latest/download/`
export const VERSION_INDEX_URL = `https://api.github.com/repos/${RELEASE_REPOSITORY}/releases?per_page=100`

const INDEX_TIMEOUT_MS = 8_000

/** A per-release generic feed: that release's own latest.yml and installer. */
export function archiveFeedUrl(version: string): string {
  return `https://github.com/${RELEASE_REPOSITORY}/releases/download/${RELEASE_TAG_PREFIX}${version}/`
}

/** Split "1.2.3-rc.1" into ([1,2,3], "rc.1"). Non-numeric segments read as 0. */
function splitVersion(value: string): { nums: number[]; pre: string } {
  const [core = '', ...preParts] = value.trim().split('-')
  const nums = core.split('.').map((part) => {
    const parsed = Number.parseInt(part, 10)
    return Number.isFinite(parsed) ? parsed : 0
  })
  while (nums.length < 3) nums.push(0)
  return { nums, pre: preParts.join('-') }
}

export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const left = splitVersion(a)
  const right = splitVersion(b)
  for (let i = 0; i < Math.max(left.nums.length, right.nums.length); i += 1) {
    const diff = (left.nums[i] ?? 0) - (right.nums[i] ?? 0)
    if (diff !== 0) return diff < 0 ? -1 : 1
  }
  return comparePrerelease(left.pre, right.pre)
}

/**
 * Semver-style prerelease precedence once the numeric core is equal. A release
 * (no prerelease) sorts above any prerelease; dot-separated identifiers
 * compare with numeric identifiers numerically and below alphanumeric ones,
 * and fewer identifiers sort below more ("alpha" < "alpha.1"). Plain string
 * comparison would order "rc.10" below "rc.9", mis-sorting the archive index
 * (and the picker/downgrade split in the preload) once a prerelease counter
 * reaches two digits.
 */
function comparePrerelease(left: string, right: string): -1 | 0 | 1 {
  if (left === right) return 0
  if (!left) return 1 // release > prerelease
  if (!right) return -1
  const l = left.split('.')
  const r = right.split('.')
  const length = Math.max(l.length, r.length)
  for (let i = 0; i < length; i += 1) {
    const x = l[i]
    const y = r[i]
    if (x === undefined) return -1 // fewer identifiers sorts below
    if (y === undefined) return 1
    if (x === y) continue
    const xn = /^\d+$/.test(x)
    const yn = /^\d+$/.test(y)
    if (xn && yn) {
      // Compare without Number() so leading-zero forms and large counters do
      // not lose precision.
      const nx = x.replace(/^0+/, '') || '0'
      const ny = y.replace(/^0+/, '') || '0'
      if (nx.length !== ny.length) return nx.length < ny.length ? -1 : 1
      if (nx !== ny) return nx < ny ? -1 : 1
      continue
    }
    if (xn) return -1 // numeric identifiers sort below alphanumeric ones
    if (yn) return 1
    if (x < y) return -1
    if (x > y) return 1
  }
  return 0
}

/**
 * Map GitHub's release list onto the picker's shape. Drafts are skipped, a tag
 * has to look like a version, and the release only counts when it carries the
 * `latest.yml` the generic feed needs — without it an install would have
 * nothing to fetch.
 */
export function parseGitHubReleases(raw: unknown): AvailableRelease[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return []
    const record = entry as Record<string, unknown>
    if (record.draft === true) return []
    const tag = typeof record.tag_name === 'string' ? record.tag_name.trim() : ''
    if (!tag) return []
    const version = tag.startsWith(RELEASE_TAG_PREFIX) ? tag.slice(RELEASE_TAG_PREFIX.length) : tag
    if (!/^\d/.test(version)) return []
    const assets = Array.isArray(record.assets) ? record.assets : []
    const hasFeed = assets.some(
      (asset) =>
        typeof asset === 'object' &&
        asset !== null &&
        (asset as Record<string, unknown>).name === 'latest.yml'
    )
    if (!hasFeed) return []
    return [{
      version,
      tag,
      archiveUrl: `https://github.com/${RELEASE_REPOSITORY}/releases/download/${tag}/`
    }]
  })
}

export async function fetchAvailableReleases(
  currentVersion: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<AvailableRelease[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), INDEX_TIMEOUT_MS)
  try {
    const response = await fetchImpl(VERSION_INDEX_URL, {
      signal: controller.signal,
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'rendcore-harness'
      }
    })
    if (!response.ok) {
      throw new Error(`Version index request failed: ${response.status}`)
    }
    const releases = parseGitHubReleases(await response.json())
    return releases
      .filter((release) => compareVersions(release.version, currentVersion) !== 0)
      .sort((a, b) => compareVersions(b.version, a.version))
  } finally {
    clearTimeout(timer)
  }
}
