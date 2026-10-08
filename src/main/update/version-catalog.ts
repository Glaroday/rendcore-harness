import type { AvailableRelease } from '../../shared/contracts'

export type { AvailableRelease }

/**
 * The repository that publishes RendCore Harness releases.
 *
 * The update sources are this repository's releases and nothing else: the
 * upstream DSH Desktop feed (dshdesktop.com) numbers its versions 0.7, 0.8,
 * 0.10 and so on, which outranks every RendCore version numerically, so asking
 * it for updates offered upstream builds as updates to this product.
 */
const RELEASE_REPO = 'Glaroday/rendcore-harness'
const RELEASE_INDEX_URL = `https://api.github.com/repos/${RELEASE_REPO}/releases?per_page=50`

const INDEX_TIMEOUT_MS = 8_000

/** Release asset directory of one tag, as GitHub serves it. */
export function archiveFeedUrl(version: string): string {
  return `https://github.com/${RELEASE_REPO}/releases/download/v${version.trim().replace(/^v/, '')}/`
}

/**
 * The feed directory holding one version's `latest.yml`, preferring the user's
 * mirrors. A mirror is a prefix glued to the GitHub path, so the version is
 * rewritten inside the URL rather than rebuilt from its host; a mirror that
 * does not carry the release path is skipped rather than guessed at.
 */
export function versionFeedUrl(version: string, mirrors: readonly string[] = []): string {
  const tag = `v${version.trim().replace(/^v/, '')}`
  for (const mirror of mirrors) {
    const rewritten = mirror.replace(/\/releases\/latest\/download\/?$/, `/releases/download/${tag}/`)
    if (rewritten !== mirror && /^https?:\/\//.test(rewritten)) return rewritten
  }
  return archiveFeedUrl(version)
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

function isRelease(value: unknown): value is AvailableRelease {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.version === 'string' &&
    record.version.length > 0 &&
    typeof record.tag === 'string' &&
    record.tag.length > 0 &&
    typeof record.archiveUrl === 'string' &&
    record.archiveUrl.length > 0
  )
}

/**
 * The releases one GitHub release index lists, in the shape the picker needs.
 * Drafts are not offered, and a tag that is not `v<semver>` is ignored.
 */
export function parseReleaseIndex(raw: unknown): AvailableRelease[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((entry) => {
    if (typeof entry !== 'object' || entry === null) return []
    const record = entry as { tag_name?: unknown; draft?: unknown }
    if (record.draft === true || typeof record.tag_name !== 'string') return []
    const tag = record.tag_name.trim()
    const version = tag.replace(/^v/, '')
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) return []
    return [{ version, tag, archiveUrl: archiveFeedUrl(version) }]
  })
}

export async function fetchAvailableReleases(
  currentVersion: string,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<AvailableRelease[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), INDEX_TIMEOUT_MS)
  try {
    const response = await fetchImpl(RELEASE_INDEX_URL, {
      headers: { accept: 'application/vnd.github+json' },
      signal: controller.signal
    })
    if (!response.ok) {
      throw new Error(`Version index request failed: ${response.status}`)
    }
    const releases = parseReleaseIndex(await response.json())
    return releases
      .filter((release) => compareVersions(release.version, currentVersion) !== 0)
      .sort((a, b) => compareVersions(b.version, a.version))
  } finally {
    clearTimeout(timer)
  }
}
