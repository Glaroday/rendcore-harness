import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: any[]) => void>(),
  updater: { setFeedURL: vi.fn(), checkForUpdates: vi.fn(), downloadUpdate: vi.fn(), quitAndInstall: vi.fn(), on: vi.fn(), autoDownload: false, allowDowngrade: false, allowPrerelease: false }
}))
vi.mock('../src/main/desktop-service', () => ({ checkDesktopUpdate: vi.fn() }))
vi.mock('electron-updater', () => ({ default: { autoUpdater: mocks.updater } }))
vi.mock('electron', () => ({ app: { isPackaged: true, getVersion: () => '0.8.0', getPath: () => '/nonexistent-desktop-test', isReady: () => true }, BrowserWindow: { getAllWindows: () => [] }, powerMonitor: { on: vi.fn(), removeListener: vi.fn() }, ipcMain: { handle: vi.fn() } }))
vi.mock('../src/main/update/update-policy', async importOriginal => ({ ...await importOriginal<object>(), supportsAutoUpdates: () => true }))

/** The first configured mirror: where every check starts, and where a pin lands. */
const MIRROR = 'https://gh-proxy.com/https://github.com/Glaroday/rendcore-harness/releases/latest/download/'
const SECOND_MIRROR = 'https://ghfast.top/https://github.com/Glaroday/rendcore-harness/releases/latest/download/'

let manager: typeof import('../src/main/update/update-manager')
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); mocks.handlers.clear()
  mocks.updater.on.mockImplementation((event, callback) => { mocks.handlers.set(event, callback) })
  mocks.updater.downloadUpdate.mockResolvedValue([])
  manager = await import('../src/main/update/update-manager')
  manager.startUpdateManager({ prepareToInstall: async () => {} })
})
afterEach(() => manager.stopUpdateManager())

it('checks this repository through the configured mirror and never downloads on its own', async () => {
  mocks.updater.checkForUpdates.mockImplementation(async () => {
    mocks.handlers.get('update-not-available')!()
    return { updateInfo: { version: '0.8.0' } }
  })
  await manager.checkForUpdates(true)
  expect(mocks.updater.setFeedURL).toHaveBeenCalledWith({ provider: 'generic', url: MIRROR })
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
  expect(manager.getUpdateStatus().phase).toBe('up-to-date')
})

it('fails closed when every configured source fails', async () => {
  mocks.updater.checkForUpdates.mockRejectedValue(new Error('feed offline'))
  await manager.checkForUpdates()
  expect(manager.getUpdateStatus().phase).toBe('error')
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
})

it('rotates to the next mirror when one cannot answer', async () => {
  mocks.updater.checkForUpdates
    .mockRejectedValueOnce(new Error('mirror down'))
    .mockImplementation(async () => {
      mocks.handlers.get('update-available')!({ version: '0.9.0' })
      return { updateInfo: { version: '0.9.0' } }
    })
  await manager.checkForUpdates()
  expect(mocks.updater.setFeedURL).toHaveBeenCalledWith({ provider: 'generic', url: MIRROR })
  expect(mocks.updater.setFeedURL).toHaveBeenCalledWith({ provider: 'generic', url: SECOND_MIRROR })
  expect(manager.getUpdateStatus()).toMatchObject({ phase: 'available', availableVersion: '0.9.0' })
})

it('holds an offered update until the user accepts it, and coalesces a second check', async () => {
  mocks.updater.checkForUpdates.mockImplementation(async () => {
    mocks.handlers.get('update-available')!({ version: '0.9.0' })
    return { updateInfo: { version: '0.9.0' } }
  })
  const first = manager.checkForUpdates()
  const second = manager.checkForUpdates(true)
  expect(mocks.updater.checkForUpdates).toHaveBeenCalledTimes(1)
  await Promise.all([first, second])
  expect(manager.getUpdateStatus().phase).toBe('available')
  expect(mocks.updater.downloadUpdate).not.toHaveBeenCalled()
  await manager.downloadAvailableUpdate()
  expect(mocks.updater.downloadUpdate).toHaveBeenCalledTimes(1)
})

it('pins a history install onto the mirror that carries that version', async () => {
  mocks.updater.checkForUpdates.mockImplementation(async () => {
    mocks.handlers.get('update-available')!({ version: '0.7.0' })
    return { updateInfo: { version: '0.7.0' } }
  })
  await manager.installSpecificVersion('../../unsafe')
  expect(mocks.updater.checkForUpdates).not.toHaveBeenCalled()
  await manager.installSpecificVersion('0.7.0')
  expect(mocks.updater.setFeedURL).toHaveBeenCalledWith({
    provider: 'generic',
    url: 'https://gh-proxy.com/https://github.com/Glaroday/rendcore-harness/releases/download/v0.7.0/'
  })
  expect(mocks.updater.downloadUpdate).toHaveBeenCalledTimes(1)
  expect(mocks.updater.allowDowngrade).toBe(false)
})
