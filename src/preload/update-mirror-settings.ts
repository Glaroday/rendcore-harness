import { ipcRenderer } from 'electron'
import { placeUpdateMirrorButton } from './update-mirror-position'

const UPDATE_SETTINGS_BUTTON_ID = 'rendcore-update-settings-button'

export function mountUpdateMirrorSettings(): () => void {
const locale = navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
let updateSettingsButton: HTMLButtonElement | undefined
let sidebarSettingsArea: HTMLElement | undefined
let sidebarRoot: HTMLElement | undefined
function liveElement<T extends Element>(cached: T | undefined, selector: string): T | undefined {
 return cached?.isConnected ? cached : document.querySelector<T>(selector) ?? undefined
}
function mountUpdateSettingsButton(): void {
  sidebarSettingsArea = liveElement(sidebarSettingsArea, '[data-dsh-sidebar-settings]')
  const settingsArea = sidebarSettingsArea
  if (!settingsArea) return
  if (!document.getElementById(`${UPDATE_SETTINGS_BUTTON_ID}-style`)) {
    const style = document.createElement('style')
    style.id = `${UPDATE_SETTINGS_BUTTON_ID}-style`
    style.textContent = updateSettingsButtonStyles
    document.head.appendChild(style)
  }
  if (!updateSettingsButton?.isConnected) {
    updateSettingsButton = document.getElementById(UPDATE_SETTINGS_BUTTON_ID) as HTMLButtonElement | null ?? undefined
  }
  if (!updateSettingsButton) {
    updateSettingsButton = document.createElement('button')
    updateSettingsButton.id = UPDATE_SETTINGS_BUTTON_ID
    updateSettingsButton.type = 'button'
    updateSettingsButton.innerHTML = updateSettingsIcon
    updateSettingsButton.addEventListener('click', () => void showUpdateSettings())
  }
  placeUpdateMirrorButton(settingsArea, updateSettingsButton)
  sidebarRoot = liveElement(sidebarRoot, '[data-dsh-sidebar-root]')
  const hidden = sidebarRoot?.dataset.dshSidebarWide !== 'true'
  if (updateSettingsButton.hidden !== hidden) updateSettingsButton.hidden = hidden
  const label = locale === 'zh' ? '更新镜像设置' : 'Update mirror settings'
  updateSettingsButton.title = label
  updateSettingsButton.setAttribute('aria-label', label)
}

async function showUpdateSettings(): Promise<void> {
  const value = await ipcRenderer.invoke('updates:config:get') as {
    mirrors: string[]
    fallbackToGitHub: boolean
  }
  const dialog = document.createElement('dialog')
  dialog.id = 'rendcore-update-settings-dialog'
  dialog.innerHTML = `
    <form method="dialog">
      <header><strong>${locale === 'zh' ? '更新镜像代理' : 'Update mirrors'}</strong><button value="cancel" aria-label="Close">&times;</button></header>
      <p>${locale === 'zh' ? '每行一个包含 latest.yml 的更新镜像目录，按顺序尝试。' : 'Enter one update feed per line. Each feed must expose latest.yml.'}</p>
      <textarea rows="6" spellcheck="false"></textarea>
      <label><input type="checkbox"> ${locale === 'zh' ? '镜像失败后回退到 GitHub' : 'Fall back to GitHub after mirror failures'}</label>
      <output></output>
      <footer><button value="reset" type="button">${locale === 'zh' ? '恢复默认' : 'Restore defaults'}</button><button value="cancel">${locale === 'zh' ? '取消' : 'Cancel'}</button><button class="primary" value="save">${locale === 'zh' ? '保存' : 'Save'}</button></footer>
    </form>`
  const textarea = dialog.querySelector('textarea')!
  const fallback = dialog.querySelector<HTMLInputElement>('input')!
  const output = dialog.querySelector('output')!
  textarea.value = value.mirrors.join('\n')
  fallback.checked = value.fallbackToGitHub
  dialog.querySelector<HTMLButtonElement>('button[value="reset"]')!.onclick = async () => {
    const reset = await ipcRenderer.invoke('updates:config:reset') as typeof value
    textarea.value = reset.mirrors.join('\n')
    fallback.checked = reset.fallbackToGitHub
  }
  dialog.addEventListener('close', () => dialog.remove())
  dialog.addEventListener('cancel', () => dialog.remove())
  dialog.querySelector('form')!.addEventListener('submit', async (event) => {
    const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null
    if (submitter?.value !== 'save') return
    event.preventDefault()
    try {
      await ipcRenderer.invoke('updates:config:set', {
        mirrors: textarea.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        fallbackToGitHub: fallback.checked
      })
      dialog.close()
    } catch (error) {
      output.textContent = error instanceof Error ? error.message : String(error)
    }
  })
  document.body.appendChild(dialog)
  dialog.showModal()
}


let scheduled = false
const observer = new MutationObserver(() => {
 if (scheduled) return
 scheduled = true
 queueMicrotask(() => { scheduled = false; mountUpdateSettingsButton() })
})
mountUpdateSettingsButton()
observer.observe(document.documentElement, {childList: true, subtree: true})
return () => observer.disconnect()
}

const updateSettingsIcon = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M12 4v3M12 17v3M4 12h3M17 12h3M6.35 6.35l2.1 2.1M15.55 15.55l2.1 2.1M17.65 6.35l-2.1 2.1M8.45 15.55l-2.1 2.1" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/><circle cx="12" cy="12" r="3.25" stroke="currentColor" stroke-width="1.65"/></svg>`

const updateSettingsButtonStyles = `
  #${UPDATE_SETTINGS_BUTTON_ID} { appearance:none; width:32px; height:32px; color:var(--dsw-alias-label-secondary,#73777f); background:transparent; border:0; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
  #${UPDATE_SETTINGS_BUTTON_ID}:hover { color:var(--dsw-alias-label-primary,#202124); background:var(--dsw-alias-interactive-bg-hover,rgba(32,33,36,.08)); }
  #${UPDATE_SETTINGS_BUTTON_ID}[hidden] { display:none; }
  #rendcore-update-settings-dialog { width:min(560px,calc(100vw - 32px)); color:var(--dsw-alias-label-primary,#202124); background:var(--dsw-alias-bg-layer-1,#fff); border:1px solid var(--dsw-alias-border-l2,#ccc); border-radius:8px; padding:0; font:13px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  #rendcore-update-settings-dialog::backdrop { background:rgba(0,0,0,.45); }
  #rendcore-update-settings-dialog form { display:grid; gap:13px; padding:20px; }
  #rendcore-update-settings-dialog header,#rendcore-update-settings-dialog footer { display:flex; align-items:center; gap:8px; }
  #rendcore-update-settings-dialog header strong { font-size:16px; }
  #rendcore-update-settings-dialog header button { margin-left:auto; border:0; background:transparent; font-size:20px; }
  #rendcore-update-settings-dialog p { margin:0; color:var(--dsw-alias-label-secondary,#73777f); }
  #rendcore-update-settings-dialog textarea { resize:vertical; width:100%; padding:9px; color:inherit; background:transparent; border:1px solid var(--dsw-alias-border-l2,#bbb); border-radius:6px; font:12px/1.5 ui-monospace,Consolas,monospace; }
  #rendcore-update-settings-dialog output { color:#b42318; min-height:18px; }
  #rendcore-update-settings-dialog footer { justify-content:flex-end; }
  #rendcore-update-settings-dialog footer button { min-height:32px; padding:5px 12px; color:inherit; background:transparent; border:1px solid var(--dsw-alias-border-l2,#bbb); border-radius:6px; cursor:pointer; }
  #rendcore-update-settings-dialog footer button:first-child { margin-right:auto; }
  #rendcore-update-settings-dialog footer .primary { color:#fff; background:#4d6bfe; border-color:#4d6bfe; }
`
