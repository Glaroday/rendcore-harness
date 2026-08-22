import { contextBridge, ipcRenderer } from 'electron'
import type { UpdateStatus } from '../shared/contracts'
import {
  isUpdateDismissed,
  shouldShowUpdate,
  updateMessage,
  type UpdateLocale
} from './update-view'
import { isPluginLoadError } from './plugin-error-view'
import { mountWindowsTitlebar } from './windows-titlebar'

const ROOT_ID = 'dsh-desktop-update-root'
const MOBILE_BUTTON_ID = 'dsh-desktop-mobile-button'
const UPDATE_SETTINGS_BUTTON_ID = 'dsh-desktop-update-settings-button'
const UPDATE_SETTINGS_ROOT_ID = 'dsh-desktop-update-settings-root'
const locale: UpdateLocale = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'

let host: HTMLDivElement | undefined
let content: HTMLDivElement | undefined
let currentStatus: UpdateStatus | undefined
let dismissedVersion: string | null = null
let dismissedTransientPhase: UpdateStatus['phase'] | null = null
let installing = false
let receivedStatusEvent = false
let phoneConnected = false
let mobileStatusTimer: number | undefined
let bootFailureTriggered = false
let bootFailureTimer: number | undefined
let updateSettingsHost: HTMLDivElement | undefined
let updateSettingsContent: HTMLDivElement | undefined
const pendingBootFailureMessages: string[] = []

const BOOT_FAILURE_SETTLE_MS = 400

function currentBootFailureText(): string | undefined {
  const root = document.body || document.documentElement
  if (!root) return undefined

  // The package list and loader detail are rendered in separate sibling
  // containers on Harness's boot-failure page. Reading only the title's
  // parent drops exactly the evidence Desktop needs to identify the second
  // conflicting plugin, so capture the full failure page instead.
  const text = document.body?.innerText || root.textContent
  if (!text?.includes('Failed to load plugins')) return undefined
  return text
    ?.split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean)
    .join('\n')
}

function addBootFailureMessage(message: string | undefined): void {
  const normalized = message?.trim()
  if (!normalized || pendingBootFailureMessages.includes(normalized)) return
  pendingBootFailureMessages.push(normalized)
}

function queueBootFailure(message?: string): void {
  if (bootFailureTriggered) return

  addBootFailureMessage(message)
  addBootFailureMessage(currentBootFailureText())
  if (pendingBootFailureMessages.length === 0) return

  if (bootFailureTimer !== undefined) window.clearTimeout(bootFailureTimer)
  bootFailureTimer = window.setTimeout(() => {
    bootFailureTimer = undefined
    if (bootFailureTriggered) return

    // The web boot page renders the plugin name and detailed loader error after
    // window.error/unhandledrejection fires. Read it one last time before leaving
    // the page so recovery receives the richest available diagnostic evidence.
    addBootFailureMessage(currentBootFailureText())
    const errorText = pendingBootFailureMessages.join('\n')
    if (!errorText) return

    bootFailureTriggered = true
    void ipcRenderer.invoke('harness:open-recovery', errorText)
  }, BOOT_FAILURE_SETTLE_MS)
}

function checkBootFailureInDom(): void {
  const errorText = currentBootFailureText()
  if (!errorText) return
  queueBootFailure(errorText)
}

const domObserver = new MutationObserver(() => {
  mountMobileButton()
  mountUpdateSettingsButton()
  checkBootFailureInDom()
})

contextBridge.exposeInMainWorld('dshDesktopDirectoryPicker', {
  pick: (): Promise<string | null> => ipcRenderer.invoke('directory-picker:open')
})

function mountMobileButton(): void {
  let style = document.getElementById(`${MOBILE_BUTTON_ID}-style`)
  if (!style) {
    style = document.createElement('style')
    style.id = `${MOBILE_BUTTON_ID}-style`
    style.textContent = mobileButtonStyles
    document.head.appendChild(style)
  }
  const settingsArea = document.querySelector<HTMLElement>('[data-dsh-sidebar-settings]')
  if (!settingsArea) return
  let button = document.getElementById(MOBILE_BUTTON_ID) as HTMLButtonElement | null
  if (!button) {
    button = document.createElement('button')
    button.id = MOBILE_BUTTON_ID
    button.type = 'button'
    button.innerHTML = `${phoneIcon}<span aria-hidden="true"></span>`
    button.addEventListener('click', () => {
      void ipcRenderer.invoke('mobile:open-pairing').catch((error: unknown) => {
        console.error('[mobile] unable to open pairing window', error)
      })
    })
  }
  if (button.parentElement !== settingsArea) settingsArea.appendChild(button)
  renderMobileButton()
}

function mountUpdateSettingsButton(): void {
  let style = document.getElementById(`${UPDATE_SETTINGS_BUTTON_ID}-style`)
  if (!style) {
    style = document.createElement('style')
    style.id = `${UPDATE_SETTINGS_BUTTON_ID}-style`
    style.textContent = updateSettingsButtonStyles
    document.head.appendChild(style)
  }
  const settingsArea = document.querySelector<HTMLElement>('[data-dsh-sidebar-settings]')
  if (!settingsArea) return
  let button = document.getElementById(UPDATE_SETTINGS_BUTTON_ID) as HTMLButtonElement | null
  if (!button) {
    button = document.createElement('button')
    button.id = UPDATE_SETTINGS_BUTTON_ID
    button.type = 'button'
    button.innerHTML = updateSettingsIcon
    button.addEventListener('click', () => void openUpdateSettings())
  }
  if (button.parentElement !== settingsArea) settingsArea.appendChild(button)
  const root = document.querySelector<HTMLElement>('[data-dsh-sidebar-root]')
  const wide = root?.dataset.dshSidebarWide === 'true'
  button.hidden = root !== null && !wide
  button.setAttribute('aria-label', locale === 'zh' ? '更新镜像设置' : 'Update mirror settings')
  button.title = locale === 'zh' ? '更新镜像设置' : 'Update mirror settings'
}

async function openUpdateSettings(): Promise<void> {
  ensureUpdateSettingsHost()
  if (!updateSettingsHost || !updateSettingsContent) return
  updateSettingsHost.style.display = 'flex'
  updateSettingsContent.textContent = locale === 'zh' ? '正在读取更新配置…' : 'Loading update settings…'
  try {
    const value = (await ipcRenderer.invoke('updates:config:get')) as {
      mirrors?: unknown
      fallbackToGitHub?: unknown
      defaults?: unknown
    }
    renderUpdateSettings(value)
  } catch (error) {
    updateSettingsContent.textContent = error instanceof Error ? error.message : String(error)
  }
}

function ensureUpdateSettingsHost(): void {
  if (updateSettingsHost && updateSettingsContent) return
  updateSettingsHost = document.createElement('div')
  updateSettingsHost.id = UPDATE_SETTINGS_ROOT_ID
  updateSettingsHost.style.display = 'none'
  const shadow = updateSettingsHost.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = updateSettingsStyles
  updateSettingsContent = document.createElement('div')
  updateSettingsContent.className = 'panel-wrap'
  shadow.append(style, updateSettingsContent)
  document.documentElement.appendChild(updateSettingsHost)
}

function renderUpdateSettings(value: {
  mirrors?: unknown
  fallbackToGitHub?: unknown
  defaults?: unknown
}): void {
  if (!updateSettingsContent) return
  const mirrors = Array.isArray(value.mirrors)
    ? value.mirrors.filter((item): item is string => typeof item === 'string')
    : []
  const defaults = Array.isArray(value.defaults)
    ? value.defaults.filter((item): item is string => typeof item === 'string')
    : []
  const zh = locale === 'zh'
  updateSettingsContent.innerHTML = `
    <section class="panel" role="dialog" aria-modal="true" aria-labelledby="update-settings-title">
      <header><strong id="update-settings-title">${zh ? '更新镜像代理' : 'Update mirrors'}</strong><button class="close" type="button" aria-label="${zh ? '关闭' : 'Close'}">×</button></header>
      <p class="hint">${zh ? '每行填写一个更新 feed 地址，按顺序尝试。地址必须指向包含 latest.yml 的镜像目录。' : 'Enter one update feed per line. They are tried in order and must expose latest.yml.'}</p>
      <textarea class="mirrors" rows="5" spellcheck="false"></textarea>
      <label class="fallback"><input type="checkbox" /> <span>${zh ? '镜像失败后回退到 GitHub 官方地址' : 'Fall back to official GitHub when mirrors fail'}</span></label>
      <p class="hint small">${zh ? '留空并保存将直接使用 GitHub。' : 'Leave empty to use GitHub directly.'}</p>
      <div class="error" role="alert" hidden></div>
      <footer><button class="reset" type="button">${zh ? '恢复内置默认' : 'Restore defaults'}</button><span class="spacer"></span><button class="cancel" type="button">${zh ? '取消' : 'Cancel'}</button><button class="save" type="button">${zh ? '保存' : 'Save'}</button></footer>
    </section>`

  const panel = updateSettingsContent.querySelector<HTMLElement>('.panel')
  const textarea = updateSettingsContent.querySelector<HTMLTextAreaElement>('.mirrors')
  const fallback = updateSettingsContent.querySelector<HTMLInputElement>('.fallback input')
  const error = updateSettingsContent.querySelector<HTMLElement>('.error')
  if (!panel || !textarea || !fallback || !error) return
  textarea.value = mirrors.join('\n')
  fallback.checked = value.fallbackToGitHub !== false
  const close = () => {
    if (updateSettingsHost) updateSettingsHost.style.display = 'none'
  }
  updateSettingsContent.querySelector<HTMLButtonElement>('.close')?.addEventListener('click', close)
  updateSettingsContent.querySelector<HTMLButtonElement>('.cancel')?.addEventListener('click', close)
  updateSettingsContent.querySelector<HTMLButtonElement>('.reset')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement
    button.disabled = true
    try {
      const restored = (await ipcRenderer.invoke('updates:config:reset')) as { mirrors?: unknown; fallbackToGitHub?: unknown }
      textarea.value = Array.isArray(restored.mirrors) ? restored.mirrors.filter((item): item is string => typeof item === 'string').join('\n') : defaults.join('\n')
      fallback.checked = restored.fallbackToGitHub !== false
    } catch (cause) {
      error.hidden = false
      error.textContent = cause instanceof Error ? cause.message : String(cause)
    } finally {
      button.disabled = false
    }
  })
  updateSettingsContent.querySelector<HTMLButtonElement>('.save')?.addEventListener('click', async (event) => {
    const button = event.currentTarget as HTMLButtonElement
    const mirrorsToSave = textarea.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
    button.disabled = true
    error.hidden = true
    try {
      await ipcRenderer.invoke('updates:config:set', {
        mirrors: mirrorsToSave,
        fallbackToGitHub: fallback.checked
      })
      close()
    } catch (cause) {
      error.hidden = false
      error.textContent = cause instanceof Error ? cause.message : String(cause)
    } finally {
      button.disabled = false
    }
  })
  panel.addEventListener('click', (event) => {
    if (event.target === panel) close()
  })
}

function renderMobileButton(): void {
  const button = document.getElementById(MOBILE_BUTTON_ID) as HTMLButtonElement | null
  const root = document.querySelector<HTMLElement>('[data-dsh-sidebar-root]')
  if (!button || !root) return
  const wide = root.dataset.dshSidebarWide === 'true'
  button.hidden = !wide && !phoneConnected
  button.classList.toggle('is-connected', phoneConnected)
  const label = phoneConnected
    ? locale === 'zh' ? '管理手机连接' : 'Manage phone connection'
    : locale === 'zh' ? '连接手机' : 'Connect phone'
  button.setAttribute('aria-label', label)
  button.title = label
}

async function refreshMobileStatus(): Promise<void> {
  try {
    const status = (await ipcRenderer.invoke('mobile:status')) as { connected?: boolean }
    phoneConnected = status.connected === true
    mountMobileButton()
  } catch (error) {
    console.warn('[mobile] unable to read connection status', error)
  }
}

function initializeUi(): void {
  if (process.platform === 'win32') {
    mountWindowsTitlebar({ document, ipcRenderer, locale })
  }
  mount()
  mountMobileButton()
  mountUpdateSettingsButton()
  checkBootFailureInDom()
  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  })
  void refreshMobileStatus()
  mobileStatusTimer ??= window.setInterval(() => void refreshMobileStatus(), 1000)
}

window.addEventListener('error', (event) => {
  const err = event.error ?? event.message
  if (isPluginLoadError(err)) {
    const errorText = typeof err === 'string' ? err : err instanceof Error ? err.message : String(err)
    queueBootFailure(errorText)
  }
})

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  if (isPluginLoadError(reason)) {
    const errorText = typeof reason === 'string' ? reason : reason instanceof Error ? reason.message : String(reason)
    queueBootFailure(errorText)
  }
})

contextBridge.exposeInMainWorld(
  'dshDesktop',
  Object.freeze({
    restartHarness: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('harness:restart')
  })
)

contextBridge.exposeInMainWorld(
  'dshRecovery',
  Object.freeze({
    action: (action: string): Promise<{ ok: boolean }> => ipcRenderer.invoke('recovery:action', action)
  })
)

function mount(): void {
  if (document.getElementById(ROOT_ID)) return

  host = document.createElement('div')
  host.id = ROOT_ID
  host.style.cssText = [
    'position:fixed',
    'right:20px',
    'bottom:20px',
    'z-index:2147483646',
    'display:none',
    'width:min(384px,calc(100vw - 40px))',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'
  ].join(';')

  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = styles
  content = document.createElement('div')
  shadow.append(style, content)
  document.documentElement.appendChild(host)
  render()
}

function applyStatus(status: UpdateStatus): void {
  currentStatus = status
  if (host) {
    host.dataset.updatePhase = status.phase
    host.dataset.updateManual = String(status.manual)
  }
  if (status.phase === 'error') installing = false
  render()
}

function render(): void {
  if (!host || !content || !currentStatus) return

  if (
    !shouldShowUpdate(currentStatus) ||
    isUpdateDismissed(currentStatus, dismissedVersion, dismissedTransientPhase)
  ) {
    host.style.display = 'none'
    content.replaceChildren()
    return
  }

  host.style.display = 'block'
  const status = currentStatus
  const card = element('aside', 'card')
  card.setAttribute('aria-live', 'polite')
  card.setAttribute('aria-label', locale === 'zh' ? 'RendCore Harness 更新' : 'RendCore Harness update')

  const row = element('div', 'row')
  const indicator = element('span', isBusy(status) ? 'spinner' : 'dot')
  indicator.setAttribute('aria-hidden', 'true')
  row.appendChild(indicator)

  const body = element('div', 'body')
  const message = element('p', 'message')
  message.textContent = updateMessage(status, locale)
  body.appendChild(message)

  if (status.phase === 'error' && status.message) {
    const detail = element('p', 'detail')
    detail.textContent = status.message
    body.appendChild(detail)
  }

  if (status.phase === 'downloading') {
    const progress = element('div', 'progress')
    progress.setAttribute('role', 'progressbar')
    progress.setAttribute('aria-valuemin', '0')
    progress.setAttribute('aria-valuemax', '100')
    progress.setAttribute('aria-valuenow', String(Math.round(status.percent ?? 0)))
    const value = element('div', 'progressValue')
    value.style.width = `${status.percent ?? 0}%`
    progress.appendChild(value)
    body.appendChild(progress)
  }

  if (status.phase === 'downloaded') {
    const actions = element('div', 'actions')
    const install = button(
      installing
        ? locale === 'zh'
          ? '正在重启…'
          : 'Restarting…'
        : locale === 'zh'
          ? '重新启动并安装'
          : 'Restart and install',
      'primary'
    )
    install.disabled = installing
    install.addEventListener('click', () => {
      installing = true
      render()
      void ipcRenderer.invoke('updates:install').catch((error: unknown) => {
        installing = false
        console.error('[updater] unable to install update', error)
        render()
      })
    })
    actions.append(install)
    body.appendChild(actions)
  }

  row.appendChild(body)

  const close = button('×', 'close')
  close.setAttribute('aria-label', locale === 'zh' ? '关闭' : 'Close')
  close.addEventListener('click', dismissCurrent)
  row.appendChild(close)

  card.appendChild(row)
  content.replaceChildren(card)
}

function dismissCurrent(): void {
  if (!currentStatus) return
  if (currentStatus.availableVersion) {
    dismissedVersion = currentStatus.availableVersion
  } else {
    dismissedTransientPhase = currentStatus.phase
  }
  render()
}

function isBusy(status: UpdateStatus): boolean {
  return status.phase === 'checking' || status.phase === 'downloading'
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  node.className = className
  return node
}

function button(label: string, className: string): HTMLButtonElement {
  const node = element('button', className)
  node.type = 'button'
  node.textContent = label
  return node
}

const styles = `
  :host { color-scheme: light dark; }
  * { box-sizing: border-box; }
  .card {
    color: var(--dsw-alias-label-primary, #202124);
    background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.98));
    border: 1px solid var(--dsw-alias-border-l2, rgba(32, 33, 36, 0.14));
    border-radius: 14px;
    padding: 15px 16px;
    box-shadow: 0 14px 38px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
    backdrop-filter: blur(18px);
  }
  .row { display: flex; align-items: flex-start; gap: 12px; }
  .body { min-width: 0; flex: 1; }
  .message { margin: 0; font-size: 14px; font-weight: 600; line-height: 20px; }
  .detail {
    margin: 5px 0 0;
    color: var(--dsw-alias-label-secondary, #666b73);
    font-size: 12px;
    line-height: 17px;
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  .dot {
    width: 10px;
    height: 10px;
    margin-top: 5px;
    flex: none;
    border-radius: 999px;
    background: #4d6bfe;
    box-shadow: 0 0 0 4px rgba(77, 107, 254, 0.12);
  }
  .dot.warning {
    background: #f59e0b;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.18);
  }
  .spinner {
    width: 17px;
    height: 17px;
    margin-top: 1px;
    flex: none;
    border: 2px solid rgba(77, 107, 254, 0.22);
    border-top-color: #4d6bfe;
    border-radius: 999px;
    animation: spin 0.75s linear infinite;
  }
  .progress {
    height: 6px;
    margin-top: 10px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--dsw-alias-bg-layer-2, rgba(32, 33, 36, 0.1));
  }
  .progressValue {
    height: 100%;
    min-width: 2px;
    border-radius: inherit;
    background: #4d6bfe;
    transition: width 180ms ease;
  }
  .actions { display: flex; gap: 8px; margin-top: 12px; }
  button {
    appearance: none;
    border: 0;
    font: inherit;
    cursor: pointer;
  }
  button:focus-visible { outline: 2px solid #4d6bfe; outline-offset: 2px; }
  button:disabled { cursor: default; opacity: 0.55; }
  .primary, .secondary {
    min-height: 30px;
    padding: 5px 11px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
  }
  .primary { color: #fff; background: #4d6bfe; }
  .primary:hover:not(:disabled) { background: #3e5de7; }
  .secondary {
    color: var(--dsw-alias-label-primary, #202124);
    background: var(--dsw-alias-bg-layer-2, rgba(32, 33, 36, 0.08));
  }
  .secondary:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(32, 33, 36, 0.13)); }
  .close {
    width: 24px;
    height: 24px;
    margin: -4px -6px 0 0;
    flex: none;
    color: var(--dsw-alias-label-secondary, #73777f);
    background: transparent;
    border-radius: 7px;
    font-size: 20px;
    line-height: 20px;
  }
  .close:hover { color: var(--dsw-alias-label-primary, #202124); background: rgba(127, 127, 127, 0.1); }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-color-scheme: dark) {
    .card {
      color: var(--dsw-alias-label-primary, #f3f4f6);
      background: var(--dsw-alias-bg-layer-1, rgba(31, 32, 35, 0.98));
      border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.14));
      box-shadow: 0 16px 42px rgba(0, 0, 0, 0.42), 0 2px 8px rgba(0, 0, 0, 0.25);
    }
    .detail { color: var(--dsw-alias-label-secondary, #a9adb5); }
    .secondary { color: var(--dsw-alias-label-primary, #f3f4f6); background: rgba(255, 255, 255, 0.1); }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner { animation: none; }
    .progressValue { transition: none; }
  }
`

const phoneIcon = `<svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true"><rect x="7" y="2.75" width="10" height="18.5" rx="2.25" stroke="currentColor" stroke-width="1.7"/><path d="M10.2 5.5h3.6M10.5 18.35h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`

const mobileButtonStyles = `
  [data-dsh-sidebar-settings] { position:relative; box-sizing:border-box; }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="true"] [data-dsh-sidebar-settings] { padding-right:38px; }
  #${MOBILE_BUTTON_ID} { appearance:none; position:relative; width:32px; height:32px; color:var(--dsw-alias-label-secondary,#73777f); background:transparent; border:0; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="true"] #${MOBILE_BUTTON_ID} { position:absolute; right:0; top:50%; transform:translateY(-50%); }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="false"] [data-dsh-sidebar-settings] { flex-direction:column; align-items:center; }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="false"] #${MOBILE_BUTTON_ID} { flex:none; margin-top:5px; }
  #${MOBILE_BUTTON_ID}:hover { color:var(--dsw-alias-label-primary,#202124); background:var(--dsw-alias-interactive-bg-hover,rgba(32,33,36,.08)); }
  #${MOBILE_BUTTON_ID}:focus-visible { outline:2px solid #4d6bfe; outline-offset:1px; }
  #${MOBILE_BUTTON_ID}[hidden] { display:none; }
  #${MOBILE_BUTTON_ID} > span { position:absolute; top:4px; right:4px; width:7px; height:7px; border:1.5px solid var(--dsw-specific-sidebar-fill,#fff); border-radius:50%; background:#4da66d; opacity:0; }
  #${MOBILE_BUTTON_ID}.is-connected > span { opacity:1; }
`

const updateSettingsIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.35 6.35l2.1 2.1M15.55 15.55l2.1 2.1M17.65 6.35l-2.1 2.1M8.45 15.55l-2.1 2.1" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/><circle cx="12" cy="12" r="3.25" stroke="currentColor" stroke-width="1.65"/></svg>`

const updateSettingsButtonStyles = `
  [data-dsh-sidebar-settings] { position:relative; box-sizing:border-box; }
  #${UPDATE_SETTINGS_BUTTON_ID} { appearance:none; position:relative; width:32px; height:32px; color:var(--dsw-alias-label-secondary,#73777f); background:transparent; border:0; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="true"] [data-dsh-sidebar-settings] { padding-right:76px; }
  [data-dsh-sidebar-root][data-dsh-sidebar-wide="true"] #${UPDATE_SETTINGS_BUTTON_ID} { position:absolute; right:38px; top:50%; transform:translateY(-50%); }
  #${UPDATE_SETTINGS_BUTTON_ID}:hover { color:var(--dsw-alias-label-primary,#202124); background:var(--dsw-alias-interactive-bg-hover,rgba(32,33,36,.08)); }
  #${UPDATE_SETTINGS_BUTTON_ID}:focus-visible { outline:2px solid #4d6bfe; outline-offset:1px; }
  #${UPDATE_SETTINGS_BUTTON_ID}[hidden] { display:none; }
`

const updateSettingsStyles = `
  :host { color-scheme: light dark; }
  * { box-sizing:border-box; }
  .panel-wrap { position:fixed; inset:0; z-index:2147483647; display:flex; align-items:center; justify-content:center; padding:20px; background:rgba(0,0,0,.42); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .panel { width:min(560px,100%); color:var(--dsw-alias-label-primary,#202124); background:var(--dsw-alias-bg-layer-1,#fff); border:1px solid var(--dsw-alias-border-l2,rgba(32,33,36,.16)); border-radius:14px; padding:20px; box-shadow:0 20px 70px rgba(0,0,0,.3); }
  header, footer { display:flex; align-items:center; gap:10px; }
  header { justify-content:space-between; }
  strong { font-size:16px; }
  .close { appearance:none; width:28px; height:28px; border:0; border-radius:8px; color:inherit; background:transparent; font-size:21px; cursor:pointer; }
  .close:hover { background:rgba(127,127,127,.12); }
  .hint { margin:12px 0; color:var(--dsw-alias-label-secondary,#666b73); font-size:12.5px; line-height:18px; }
  .small { margin-top:8px; }
  .mirrors { width:100%; resize:vertical; min-height:116px; padding:10px; color:inherit; background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.1)); border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.25)); border-radius:9px; font:12px/18px ui-monospace,SFMono-Regular,Consolas,monospace; }
  .mirrors:focus { outline:2px solid #4d6bfe; outline-offset:1px; }
  .fallback { display:flex; align-items:center; gap:8px; margin-top:14px; font-size:13px; }
  .error { margin-top:10px; color:#b42318; font-size:12px; line-height:17px; }
  footer { margin-top:18px; }
  footer button { min-height:32px; padding:6px 13px; border-radius:8px; border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.25)); color:inherit; background:transparent; font:600 12px inherit; cursor:pointer; }
  footer .save { color:#fff; background:#4d6bfe; border-color:#4d6bfe; }
  footer button:disabled { opacity:.55; cursor:default; }
  .spacer { flex:1; }
  @media (prefers-color-scheme:dark) { .panel { color:var(--dsw-alias-label-primary,#f3f4f6); background:var(--dsw-alias-bg-layer-1,#1f2023); } .error { color:#fda29b; } }
`

ipcRenderer.on('updates:status-changed', (_event, status: UpdateStatus) => {
  receivedStatusEvent = true
  applyStatus(status)
})

void ipcRenderer
  .invoke('updates:status')
  .then((status: UpdateStatus) => {
    if (!receivedStatusEvent) applyStatus(status)
  })
  .catch((error: unknown) => console.warn('[updater] unable to read update status', error))

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeUi, { once: true })
} else {
  initializeUi()
}
