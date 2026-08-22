import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface UpdateFeedConfig {
  /** Generic update feeds, ordered by preference. */
  feedUrls: string[]
  /** Fall back to the official GitHub Releases feed after mirror failures. */
  fallbackToGitHub: boolean
}

export const UPDATE_CONFIG_FILENAME = 'update-config.json'

export const DEFAULT_UPDATE_FEED_CONFIG: UpdateFeedConfig = {
  // Verified on 2026-08-22: both feeds served latest.yml and the referenced
  // Windows installer for RendCore Harness. Keep GitHub as the final fallback.
  feedUrls: [
    'https://gh-proxy.com/https://github.com/Glaroday/rendcore-harness/releases/latest/download/',
    'https://ghfast.top/https://github.com/Glaroday/rendcore-harness/releases/latest/download/'
  ],
  fallbackToGitHub: true
}

/**
 * Generic feeds must expose latest.yml (and the files referenced by it) below
 * this URL. A trailing slash is required because electron-updater resolves
 * relative asset paths against the feed URL.
 */
export function normalizeUpdateFeedUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined

  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
    url.hash = ''
    return url.toString().endsWith('/') ? url.toString() : `${url.toString()}/`
  } catch {
    return undefined
  }
}

export function parseUpdateFeedConfig(raw: string): UpdateFeedConfig {
  try {
    const value = JSON.parse(raw) as {
      feedUrl?: unknown
      feedUrls?: unknown
      mirrors?: unknown
      fallbackToGitHub?: unknown
    }
    if (!value || typeof value !== 'object') return { ...DEFAULT_UPDATE_FEED_CONFIG }

    const candidates: unknown[] = []
    if (Array.isArray(value.feedUrls)) candidates.push(...value.feedUrls)
    if (Array.isArray(value.mirrors)) candidates.push(...value.mirrors)
    if (value.feedUrl !== undefined) candidates.push(value.feedUrl)

    const feedUrls = [
      ...new Set(
        candidates
          .map(normalizeUpdateFeedUrl)
          .filter((url): url is string => Boolean(url))
      )
    ]
    return {
      feedUrls,
      fallbackToGitHub: value.fallbackToGitHub !== false
    }
  } catch {
    return { ...DEFAULT_UPDATE_FEED_CONFIG }
  }
}

export function readUpdateFeedConfig(userDataPath: string, envFeedUrl = process.env.RENDCORE_UPDATE_FEED_URL): UpdateFeedConfig {
  const configPath = join(userDataPath, UPDATE_CONFIG_FILENAME)
  let config = { ...DEFAULT_UPDATE_FEED_CONFIG }

  try {
    config = parseUpdateFeedConfig(readFileSync(configPath, 'utf8'))
  } catch {
    // A missing or unreadable optional config should never block startup.
  }

  const environmentFeed = normalizeUpdateFeedUrl(envFeedUrl)
  if (environmentFeed) {
    config.feedUrls = [environmentFeed, ...config.feedUrls.filter((url) => url !== environmentFeed)]
  }
  return config
}
