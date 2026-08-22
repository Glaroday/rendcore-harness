import { app, BrowserWindow, ipcMain, powerMonitor } from 'electron'
import { readUpdateFeedConfig, type UpdateFeedConfig } from './update-feed'
import electronUpdater from 'electron-updater'
import type { UpdateStatus } from '../../shared/contracts'
import {
  AUTO_INSTALL_ON_APP_QUIT,
  shouldCheckAfterResume,
  supportsAutoUpdates,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_STARTUP_DELAY_MS,
  UPDATE_STARTUP_JITTER_MS
} from './update-policy'
import {
  initialUpdateStatus,
  reduceUpdateStatus,
  type UpdateStateEvent
} from './update-state'

const { autoUpdater } = electronUpdater
const TRANSIENT_STATUS_MS = 8_000

let status = initialUpdateStatus(app.getVersion())
let prepareToInstall: (() => Promise<void>) | undefined
let startupTimer: NodeJS.Timeout | undefined
let intervalTimer: NodeJS.Timeout | undefined
let resetTimer: NodeJS.Timeout | undefined
let checkPromise: Promise<unknown> | undefined
let lastCheckedAt = 0
let installing = false
let started = false
let handlersRegistered = false
let updateFeedConfig: UpdateFeedConfig = { feedUrls: [], fallbackToGitHub: true }
let activeMirrorIndex = -1

export function getUpdateStatus(): UpdateStatus {
  return { ...status }
}

export function registerUpdateHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true
  ipcMain.handle('updates:status', () => getUpdateStatus())
  ipcMain.handle('updates:install', () => installDownloadedUpdate())
}

export function startUpdateManager(options: { prepareToInstall: () => Promise<void> }): void {
  prepareToInstall = options.prepareToInstall
  if (started) return
  started = true

  if (!supportsUpdates()) {
    transition({
      type: 'unsupported',
      message: 'Updates are available in installed macOS and Windows builds.'
    })
    return
  }

  configureUpdater()
  startupTimer = setTimeout(
    () => void checkForUpdates(),
    UPDATE_STARTUP_DELAY_MS + Math.random() * UPDATE_STARTUP_JITTER_MS
  )
  intervalTimer = setInterval(() => void checkForUpdates(), UPDATE_CHECK_INTERVAL_MS)
  powerMonitor.on('resume', checkAfterResume)
}

export async function checkForUpdates(manual = false): Promise<UpdateStatus> {
  if (!supportsUpdates()) {
    transition(
      {
        type: 'unsupported',
        message: 'Update checks are only available in installed macOS and Windows builds.'
      },
      manual
    )
    if (manual) scheduleReset()
    return getUpdateStatus()
  }

  if (checkPromise || ['available', 'downloading', 'downloaded'].includes(status.phase)) {
    return getUpdateStatus()
  }

  transition({ type: 'check', manual })
  lastCheckedAt = Date.now()

  try {
    await checkUsingConfiguredFeeds()
  } catch (error) {
    transition({ type: 'error', message: errorMessage(error) })
    if (manual) scheduleReset()
  } finally {
    checkPromise = undefined
  }

  return getUpdateStatus()
}

export async function installDownloadedUpdate(): Promise<void> {
  if (status.phase !== 'downloaded' || installing) return
  installing = true

  try {
    await prepareToInstall?.()
    autoUpdater.quitAndInstall(false, true)
  } catch (error) {
    installing = false
    transition({ type: 'error', message: errorMessage(error) }, true)
    scheduleReset()
  }
}

export function stopUpdateManager(): void {
  if (startupTimer) clearTimeout(startupTimer)
  if (intervalTimer) clearInterval(intervalTimer)
  if (resetTimer) clearTimeout(resetTimer)
  startupTimer = undefined
  intervalTimer = undefined
  resetTimer = undefined
  if (started && app.isReady()) powerMonitor.removeListener('resume', checkAfterResume)
}

function configureUpdater(): void {
  updateFeedConfig = readUpdateFeedConfig(app.getPath('userData'))
  activeMirrorIndex = -1
  const firstFeed = updateFeedConfig.feedUrls[0]
  if (firstFeed) {
    configureMirrorFeed(firstFeed)
    activeMirrorIndex = 0
    console.info('[updater] using configured update mirror', updateFeedConfig.feedUrls[0])
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = AUTO_INSTALL_ON_APP_QUIT
  autoUpdater.allowPrerelease = false
  autoUpdater.logger = {
    info: (...args: unknown[]) => console.info('[updater]', ...args),
    warn: (...args: unknown[]) => console.warn('[updater]', ...args),
    error: (...args: unknown[]) => console.error('[updater]', ...args),
    debug: (...args: unknown[]) => console.debug('[updater]', ...args)
  }

  autoUpdater.on('checking-for-update', () =>
    transition({ type: 'check', manual: status.manual })
  )
  autoUpdater.on('update-available', (info) =>
    transition({ type: 'available', version: info.version })
  )
  autoUpdater.on('download-progress', (progress) =>
    transition({ type: 'progress', percent: progress.percent })
  )
  autoUpdater.on('update-not-available', () => {
    transition({ type: 'not-available' })
    scheduleReset()
  })
  autoUpdater.on('update-downloaded', (info) =>
    transition({ type: 'downloaded', version: info.version })
  )
  autoUpdater.on('error', (error) => {
    transition({ type: 'error', message: errorMessage(error) })
    if (status.manual) scheduleReset()
  })
}

async function checkUsingConfiguredFeeds(): Promise<void> {
  checkPromise = autoUpdater.checkForUpdates()
  try {
    await checkPromise
    return
  } catch (firstError) {
    let lastError: unknown = firstError
    for (let nextMirrorIndex = activeMirrorIndex + 1; nextMirrorIndex < updateFeedConfig.feedUrls.length; nextMirrorIndex += 1) {
      const nextFeed = updateFeedConfig.feedUrls[nextMirrorIndex]
      if (!nextFeed) continue
      configureMirrorFeed(nextFeed)
      activeMirrorIndex = nextMirrorIndex
      console.warn('[updater] update mirror failed; trying next mirror', nextFeed)
      checkPromise = autoUpdater.checkForUpdates()
      try {
        await checkPromise
        return
      } catch (nextError) {
        lastError = nextError
      }
    }

    if (activeMirrorIndex >= 0 && updateFeedConfig.fallbackToGitHub) {
      configureGitHubFeed()
      activeMirrorIndex = -1
      console.warn('[updater] update mirrors failed; falling back to GitHub Releases')
      checkPromise = autoUpdater.checkForUpdates()
      await checkPromise
      return
    }

    throw lastError
  }
}

function configureMirrorFeed(feedUrl: string): void {
  autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl })
}

function configureGitHubFeed(): void {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'Glaroday',
    repo: 'rendcore-harness',
    releaseType: 'release'
  })
}

function transition(event: UpdateStateEvent, manualOverride?: boolean): void {
  if (event.type !== 'reset' && resetTimer) {
    clearTimeout(resetTimer)
    resetTimer = undefined
  }

  status = reduceUpdateStatus(status, event)
  if (manualOverride !== undefined) status.manual = manualOverride

  console.info('[updater] status', status.phase, status.percent ?? '')
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('updates:status-changed', getUpdateStatus())
  }
}

function scheduleReset(): void {
  if (!status.manual) return
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => transition({ type: 'reset' }), TRANSIENT_STATUS_MS)
}

function checkAfterResume(): void {
  if (shouldCheckAfterResume(lastCheckedAt)) void checkForUpdates()
}

function supportsUpdates(): boolean {
  // electron-builder supplies the GitHub Releases feed for packaged builds.
  // Development builds must never query or install production updates.
  return supportsAutoUpdates(app.isPackaged, process.platform)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
