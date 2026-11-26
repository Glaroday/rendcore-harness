window.__ModuleLoader__.load({
  id: 'dsh-desktop-client-ui',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { BrandWordmark, FishLogo, MenuItemButton, Tooltip } = require('@deepseek-ai/dsh-client-ui-primitives')
    const LIGHT_LOGO_URL = '/dsh-desktop-logo-light.png'
    const DARK_LOGO_URL = '/dsh-desktop-logo-dark.png'
    const STYLE_ID = 'dsh-desktop-client-ui-style'

    function installStyles() {
      if (typeof document === 'undefined' || document.head === undefined) return
      if (document.getElementById?.(STYLE_ID)) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.dataset.plugin = 'dsh-desktop-client-ui'
      style.textContent = `
        .dshDesktopBrandDark{display:none}
        body[data-ds-dark-theme] .dshDesktopBrandLight{display:none}
        body[data-ds-dark-theme] .dshDesktopBrandDark{display:block}
      `
      document.head.appendChild(style)
    }



    // Small presentation-only primitives shared by PPT and native Office templates.
    // Callers own file import, persistence, translations and template state.
    const templateElement = React.createElement
    function TemplateIcon({ name }) {
      const paths = name === 'create' ? ['m4 20 11-11 3 3L7 23z', 'm14 10 3 3', 'M6 3v4M4 5h4M18 2v4M16 4h4M21 8v4M19 10h4']
        : name === 'edit' ? ['m15 4 5 5', 'M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z']
        : name === 'delete' ? ['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'] : ['m6 6 12 12M6 18 18 6']
      return templateElement('svg', { width: name === 'create' ? 28 : 16, height: name === 'create' ? 28 : 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.65, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        ...paths.map((d, key) => templateElement('path', { key, d })))
    }
    function TemplateCreateButton({ label, hint, disabled, onClick }) {
      return templateElement('button', { type: 'button', className: 'dsh-template-create', disabled, title: hint, onClick }, templateElement(TemplateIcon, { name: 'create' }), templateElement('span', null, label))
    }
    function TemplateCardActions({ busy, editLabel, deleteLabel, onEdit, onDelete }) {
      return templateElement('div', { className: 'dsh-template-actions' },
        templateElement('button', { type: 'button', disabled: busy, title: editLabel, 'aria-label': editLabel, onClick: onEdit }, templateElement(TemplateIcon, { name: 'edit' })),
        templateElement('button', { type: 'button', disabled: busy, title: deleteLabel, 'aria-label': deleteLabel, onClick: onDelete }, templateElement(TemplateIcon, { name: 'delete' })))
    }
    function TemplateManagementDialog({ deleting, name, description, onNameChange, onDescriptionChange, onSave, onDelete, onRequestDelete, onClose, onCancelDelete, busy, error, t }) {
      const dialog = React.useRef(null), first = React.useRef(null), title = React.useId()
      React.useLayoutEffect(() => {
        const node = dialog.current
        node.showModal(); first.current?.focus()
        return () => { if (node.open) node.close() }
      }, [])
      React.useLayoutEffect(() => { first.current?.focus() }, [deleting])
      const close = () => { if (!busy) onClose() }
      const button = (label, onClick, props = {}) => templateElement('button', { type: 'button', disabled: busy, onClick, ...props }, label)
      return templateElement('dialog', { ref: dialog, className: 'dsh-template-dialog', 'aria-modal': true, 'aria-labelledby': title,
        onCancel: event => { event.preventDefault(); close() },
        onClick: event => {
          if (event.target !== event.currentTarget) return
          const rect = event.currentTarget.getBoundingClientRect()
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close()
        },
        onKeyDown: event => {
          if (event.key !== 'Tab') return
          const fields = [...event.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')]
          const first = fields[0], last = fields.at(-1)
          if (!first) { event.preventDefault(); return }
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        } },
        templateElement('header', null, templateElement('h2', { id: title }, t(deleting ? 'deleteTitle' : 'editTitle')),
          templateElement('button', { type: 'button', className: 'dsh-template-close', disabled: busy, 'aria-label': t('close'), onClick: close }, templateElement(TemplateIcon, { name: 'close' }))),
        deleting ? templateElement('div', { className: 'dsh-template-fields' },
          templateElement('p', { className: 'dsh-template-delete-copy' },
            templateElement('bdi', null, name), templateElement('br'), t('deleteHint')),
          error ? templateElement('div', { role: 'alert', className: 'dsh-template-error' }, error) : null,
          templateElement('footer', null, button(t('cancel'), onCancelDelete ?? close, { ref: first }), button(t(busy ? 'processing' : 'confirmDelete'), onDelete)))
        : templateElement('form', { 'aria-busy': busy, onSubmit: event => { event.preventDefault(); if (!busy && name.trim()) onSave() } },
          templateElement('label', null, t('name'), templateElement('input', { ref: first, value: name, maxLength: 80, required: true, disabled: busy, autoComplete: 'off', onChange: event => onNameChange(event.target.value) })),
          templateElement('label', null, t('description'), templateElement('textarea', { value: description, maxLength: 1000, disabled: busy, placeholder: t('descriptionPlaceholder'), onChange: event => onDescriptionChange(event.target.value) })),
          error ? templateElement('div', { role: 'alert', className: 'dsh-template-error' }, error) : null,
          templateElement('footer', null, button(t('delete'), onRequestDelete), templateElement('button', { type: 'submit', disabled: busy || !name.trim() }, t(busy ? 'processing' : 'update')))))
    }
    const templateControlsCss = `
.dsh-template-create{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;aspect-ratio:16/9;width:100%;padding:20px;border:2px solid transparent;border-radius:14px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;transition:background .15s,color .15s}
.dsh-template-create:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,var(--dsw-alias-bg-base));color:var(--dsw-alias-label-primary)}
.dsh-template-create:disabled{opacity:.55;cursor:default}
.dsh-template-actions{position:absolute;top:8px;right:8px;display:flex;gap:4px;z-index:2;opacity:0;pointer-events:none;transition:opacity .12s}
[data-template-card]:hover .dsh-template-actions,[data-template-card]:focus-within .dsh-template-actions{opacity:1;pointer-events:auto}
.dsh-template-actions button{display:grid;place-items:center;width:28px;height:28px;padding:0;border:1px solid color-mix(in srgb,var(--dsw-alias-label-primary-foreground) 15%,transparent);border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 80%,transparent);color:var(--dsw-alias-label-primary-foreground);cursor:pointer;backdrop-filter:blur(8px)}
.dsh-template-actions button:hover{background:var(--dsw-alias-label-primary)}.dsh-template-actions button:disabled{opacity:.5;cursor:default}
.dsh-template-dialog{box-sizing:border-box;width:min(560px,calc(100vw - 40px));max-height:calc(100dvh - 48px);margin:auto;padding:26px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:20px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;box-shadow:0 24px 80px color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent);overflow-y:auto;overscroll-behavior:contain}
.dsh-template-dialog::backdrop{background:color-mix(in srgb,var(--dsw-alias-label-primary) 50%,transparent)}
.dsh-template-dialog header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:26px}.dsh-template-dialog h2{margin:0;font-size:18px;line-height:26px;font-weight:600}
.dsh-template-dialog .dsh-template-close{display:grid;place-items:center;flex:none;width:28px;height:28px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsh-template-dialog form,.dsh-template-fields{display:grid;gap:22px}.dsh-template-dialog label{display:grid;gap:9px;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:20px}
.dsh-template-dialog input,.dsh-template-dialog textarea{box-sizing:border-box;width:100%;margin:0;padding:12px 14px;border:1px solid transparent;border-radius:12px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:21px}.dsh-template-dialog textarea{min-height:112px;resize:vertical;max-height:260px}.dsh-template-dialog input::placeholder,.dsh-template-dialog textarea::placeholder{color:var(--dsw-alias-label-tertiary)}
.dsh-template-dialog footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:4px}.dsh-template-dialog footer button{min-height:38px;padding:8px 16px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:10px;font:inherit;font-size:14px;line-height:20px;cursor:pointer;transition:transform 120ms cubic-bezier(.23,1,.32,1)}
.dsh-template-dialog :disabled{cursor:default;opacity:.55}.dsh-template-delete-copy{margin:0 0 26px;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1.65;overflow-wrap:anywhere}.dsh-template-error{margin:0;padding:10px 12px;border-radius:10px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-template-create:focus-visible,.dsh-template-actions button:focus-visible,.dsh-template-dialog :is(button,input,textarea):focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
@media(hover:none){.dsh-template-actions{opacity:1;pointer-events:auto}}@media(hover:hover) and (pointer:fine){.dsh-template-dialog button:hover:not(:disabled){filter:brightness(.94)}.dsh-template-dialog .dsh-template-close:hover{background:var(--dsw-alias-interactive-bg-hover)}}@media(prefers-reduced-motion:reduce){.dsh-template-create,.dsh-template-actions,.dsh-template-dialog footer button{transition:none}}
`
    const TemplateLibraryControls = { CreateButton: TemplateCreateButton, CardActions: TemplateCardActions, ManagementDialog: TemplateManagementDialog }


    function DesktopBrandMark({ size, className } = {}) {
      const height = size ?? 17
      return React.createElement(
        'svg',
        {
          width: size ?? height * 1030 / 590,
          height,
          className,
          viewBox: '150 330 1030 590',
          fill: 'none',
          'aria-hidden': 'true'
        },
        React.createElement('image', {
          className: 'dshDesktopBrandLight',
          href: LIGHT_LOGO_URL,
          x: 150,
          y: 330,
          width: 1030,
          height: 590,
          preserveAspectRatio: 'xMidYMid meet'
        }),
        React.createElement('image', {
          className: 'dshDesktopBrandDark',
          href: DARK_LOGO_URL,
          x: 150,
          y: 330,
          width: 1030,
          height: 590,
          preserveAspectRatio: 'xMidYMid meet'
        })
      )
    }

    function DesktopBrandName() {
      return React.createElement('span', { style: { fontWeight: 600 } }, 'LQY')
    }

    function ConversationBrandMark(props) {
      return React.createElement('img', {
        src: DARK_LOGO_URL,
        alt: 'LQY',
        width: props?.size ?? 34,
        height: props?.size ?? 34,
        style: { objectFit: 'contain' }
      })
    }

    function OpenUnpreviewableFile({ absolutePath, openWorkspacePath, t }) {
      const [error, setError] = React.useState('')
      const label = t('openLocal')
      return React.createElement(
        React.Fragment,
        null,
        React.createElement('button', {
          type: 'button',
          'data-textpreview-open-local': true,
          onClick: () => {
            setError('')
            // Archive utilities may extract and close without a visible window.
            const request = /\.(zip|7z|rar|tar|gz|tgz|bz2)$/i.test(absolutePath)
              ? { path: absolutePath, action: 'reveal' }
              : { path: absolutePath }
            void openWorkspacePath(request).catch((reason) => {
              setError(reason instanceof Error ? reason.message : String(reason))
            })
          }
        }, label),
        error && React.createElement('span', { role: 'alert' }, error)
      )
    }

    function DeleteSessionMenuItem({ sessionId, displayTitle, useMenuOpenState, deleteSession, t }) {
      const [, setMenuOpen] = useMenuOpenState()
      const label = t('deleteSession')
      const warning = t('deleteWarning', { title: displayTitle || sessionId })
      return React.createElement(MenuItemButton, {
        danger: true,
        onSelect: () => {
          setMenuOpen(false)
          if (!window.confirm(warning)) return
          void Promise.resolve().then(() => deleteSession(sessionId)).catch((reason) => {
            window.alert(reason instanceof Error ? reason.message : String(reason))
          })
        }
      }, label)
    }

    function OpenSessionFolderMenuItem({ sessionId, useMenuOpenState, openInFinder, t }) {
      const [, setMenuOpen] = useMenuOpenState()
      if (typeof window.dshDesktop?.openInFinder !== 'function') return null
      const label = t('openFolder')
      return React.createElement(MenuItemButton, {
        onSelect: () => {
          setMenuOpen(false)
          void Promise.resolve().then(() => openInFinder(sessionId)).catch((reason) => {
            window.alert(reason instanceof Error ? reason.message : String(reason))
          })
        }
      }, label)
    }

    function UnreadSessionMenuItem({ sessionId, unread, onUnreadChange, useMenuOpenState, t }) {
      const [, setMenuOpen] = useMenuOpenState()
      return React.createElement(MenuItemButton, {
        onSelect: () => {
          setMenuOpen(false)
          onUnreadChange(sessionId, !unread)
        }
      }, t(unread ? 'markRead' : 'markUnread'))
    }

    const ACTIONS_NS = 'dsh-desktop-actions'
    const actionMessages = {
      zh: {
        deleteSession: '永久删除会话',
        deleteWarning: '确定删除“{title}”？工作区文件会保留。此操作无法撤销。',
        openFolder: '在文件管理器中打开',
        markRead: '标为已读',
        markUnread: '标为未读',
        workspaceUnavailable: '工作区导航不可用',
        directoryUnavailable: '会话工作区目录不可用'
      },
      en: {
        deleteSession: 'Delete session permanently',
        deleteWarning: 'Delete “{title}”? Workspace files are kept. This can’t be undone.',
        openFolder: 'Open in file manager',
        markRead: 'Mark as read',
        markUnread: 'Mark as unread',
        workspaceUnavailable: 'Workspace navigation is unavailable',
        directoryUnavailable: 'Session workspace directory is unavailable'
      },
      ja: {
        deleteSession: 'セッションを完全に削除',
        deleteWarning: '「{title}」を削除しますか？ワークスペースのファイルは保持されます。この操作は取り消せません。',
        openFolder: 'ファイルマネージャーで開く',
        markRead: '既読にする',
        markUnread: '未読にする',
        workspaceUnavailable: 'ワークスペースのナビゲーションを利用できません',
        directoryUnavailable: 'セッションのワークスペースディレクトリを利用できません'
      },
      es: {
        deleteSession: 'Eliminar sesión permanentemente',
        deleteWarning: '¿Eliminar «{title}»? Se conservan los archivos del espacio de trabajo. No se puede deshacer.',
        openFolder: 'Abrir en el administrador de archivos',
        markRead: 'Marcar como leído',
        markUnread: 'Marcar como no leído',
        workspaceUnavailable: 'La navegación del espacio de trabajo no está disponible',
        directoryUnavailable: 'El directorio de la sesión no está disponible'
      },
      fr: {
        deleteSession: 'Supprimer définitivement la session',
        deleteWarning: 'Supprimer « {title} » ? Les fichiers de l’espace de travail sont conservés. Cette action est irréversible.',
        openFolder: 'Ouvrir dans le gestionnaire de fichiers',
        markRead: 'Marquer comme lu',
        markUnread: 'Marquer comme non lu',
        workspaceUnavailable: 'La navigation de l’espace de travail est indisponible',
        directoryUnavailable: 'Le dossier de la session est indisponible'
      },
      de: {
        deleteSession: 'Sitzung endgültig löschen',
        deleteWarning: '„{title}“ löschen? Die Arbeitsbereichsdateien bleiben erhalten. Dies kann nicht rückgängig gemacht werden.',
        openFolder: 'Im Dateimanager öffnen',
        markRead: 'Als gelesen markieren',
        markUnread: 'Als ungelesen markieren',
        workspaceUnavailable: 'Arbeitsbereichsnavigation ist nicht verfügbar',
        directoryUnavailable: 'Das Arbeitsbereichsverzeichnis der Sitzung ist nicht verfügbar'
      },
      ru: {
        deleteSession: 'Удалить сеанс навсегда',
        deleteWarning: 'Удалить «{title}»? Файлы рабочей области сохранятся. Это действие нельзя отменить.',
        openFolder: 'Открыть в файловом менеджере',
        markRead: 'Отметить как прочитанное',
        markUnread: 'Отметить как непрочитанное',
        workspaceUnavailable: 'Навигация по рабочей области недоступна',
        directoryUnavailable: 'Каталог рабочей области сеанса недоступен'
      },
      pt: {
        deleteSession: 'Excluir sessão permanentemente',
        deleteWarning: 'Excluir “{title}”? Os arquivos do espaço de trabalho serão mantidos. Não é possível desfazer.',
        openFolder: 'Abrir no gerenciador de arquivos',
        markRead: 'Marcar como lida',
        markUnread: 'Marcar como não lida',
        workspaceUnavailable: 'A navegação do espaço de trabalho está indisponível',
        directoryUnavailable: 'O diretório da sessão está indisponível'
      }
    }

    const REPAIR_NS = 'dsh-desktop-repair'
    function DesktopUtilityActions({ t, wide }) {
      const [busy, setBusy] = React.useState(false)
      // Internal messages are translated at render time; external diagnostics
      // remain verbatim instead of becoming a stale translated state string.
      const [error, setError] = React.useState(null)
      const [connected, setConnected] = React.useState(false)
      const mounted = React.useRef(true)
      React.useEffect(() => {
        mounted.current = true
        const bridge = window.dshDesktop
        const unsubscribe = bridge?.onMobileStatus?.(status => {
          if (mounted.current) setConnected(status.connected === true)
        })
        void bridge?.getMobileStatus?.().then(status => {
          if (mounted.current) setConnected(status.connected === true)
        }).catch(() => { if (mounted.current) setError({ key: 'phoneFailed' }) })
        return () => { mounted.current = false; unsubscribe?.() }
      }, [t])
      const bridge = window.dshDesktop
      if (!bridge) return null
      const open = async (operation) => {
        if (busy) return
        setBusy(true); setError(null)
        try {
          const result = await operation()
          if (mounted.current && result?.ok === false) {
            setError(typeof result.error === 'string' && result.error !== ''
              ? { diagnostic: result.error }
              : { key: 'failed' })
          }
        } catch (reason) {
          if (mounted.current) setError({ diagnostic: reason instanceof Error ? reason.message : String(reason) })
        } finally { if (mounted.current) setBusy(false) }
      }
      const icon = (kind) => React.createElement('svg', {
        width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true
      }, kind === 'phone'
        ? React.createElement(React.Fragment, null,
          React.createElement('rect', { x: 7, y: 2.75, width: 10, height: 18.5, rx: 2.25 }),
          React.createElement('path', { d: 'M10.2 5.5h3.6M10.5 18.35h3' }))
        : React.createElement('path', { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-7.91 7.91a2.12 2.12 0 0 1-3-3l7.91-7.91a6 6 0 0 1 7.94-7.94z' }))
      return React.createElement('div', { 'data-dsh-desktop-utilities': true, 'data-wide': wide },
        typeof bridge.openRepairAgent === 'function' && React.createElement(Tooltip, {
          label: t(busy ? 'opening' : 'description'), side: 'top', align: 'end',
          portal: true, maxWidth: 280, delayMs: 0, focusDelayMs: 0
        }, React.createElement('button', {
          type: 'button', disabled: busy,
          'aria-label': t(busy ? 'opening' : 'open'), 'aria-description': t('description'), 'data-dsh-repair-entry': true,
          onClick: () => { void open(() => bridge.openRepairAgent()) }
        }, icon('repair'))),
        typeof bridge.openMobilePairing === 'function' && (wide || connected) && React.createElement('button', {
          type: 'button', disabled: busy, title: t(connected ? 'phoneManage' : 'phone'),
          'aria-label': t(connected ? 'phoneManage' : 'phone'), 'data-dsh-mobile-entry': true,
          onClick: () => { void open(() => bridge.openMobilePairing()) }
        }, icon('phone'), connected && React.createElement('span', { 'data-connected': true, 'aria-hidden': true })),
        error && React.createElement('span', { role: 'alert', 'data-dsh-utility-error': true }, error.key ? t(error.key) : error.diagnostic))
    }

    // The session-scope slot supplies Harness's public editor actions. Capture the
    // revision before IPC so an async suggestion can never overwrite a user's edit.
    function RepairDraft({ session, input, inputActions }) {
      const currentInput = React.useRef(input)
      currentInput.current = input
      React.useEffect(() => {
        const bridge = window.dshDesktop
        if (typeof bridge?.getRepairDraft !== 'function') return
        let alive = true
        const span = inputActions.captureInsertion()
        const empty = input.draft === '' && input.attachmentIds.length === 0 && input.phase === 'plain'
        void bridge.getRepairDraft(session.sessionId).then(async draft => {
          if (!alive || typeof draft?.token !== 'string') return
          const current = currentInput.current
          if (empty && current.draft === '' && current.attachmentIds.length === 0 && current.phase === 'plain' && typeof draft.text === 'string' && draft.text) {
            if (inputActions.insertText(draft.text, span)) inputActions.persistDraft()
          }
          await bridge.acknowledgeRepairDraft(session.sessionId, draft.token)
        }).catch(error => { console.warn('[desktop-repair] draft initialization failed', error) })
        return () => { alive = false }
      }, [session.sessionId, inputActions])
      return null
    }
    function applyRepair(ctx) {
      ctx.effect(() => ctx.locale.register(REPAIR_NS, {
        zh: { open: '进入维修模式', description: '维修 Agent：协助排查和修复问题。点击进入修复模式，描述问题后发送。', opening: '正在打开维修…', failed: '无法打开维修会话，请重试', phone: '连接手机', phoneManage: '管理手机连接', phoneFailed: '无法读取手机连接状态' },
        en: { open: 'Enter repair mode', description: 'Repair Agent helps diagnose and resolve problems. Click to enter repair mode, describe the issue, and send when ready.', opening: 'Opening repair…', failed: 'Could not open repair. Please retry.', phone: 'Connect phone', phoneManage: 'Manage phone connection', phoneFailed: 'Could not read phone connection status.' },
        ja: {"open": "修復モードに入る", "description": "修復 Agent が問題の診断と解決を支援します。修復モードに入り、問題を説明して送信してください。", "opening": "修復を開いています…", "failed": "修復を開けません。もう一度お試しください。", "phone": "スマートフォンを接続", "phoneManage": "スマートフォン接続を管理", "phoneFailed": "接続状態を取得できません。"},
        es: {"open": "Entrar en modo de reparación", "description": "El agente de reparación ayuda a diagnosticar y resolver problemas. Entre, describa el problema y envíelo cuando esté listo.", "opening": "Abriendo reparación…", "failed": "No se pudo abrir la reparación. Inténtelo de nuevo.", "phone": "Conectar teléfono", "phoneManage": "Administrar conexión del teléfono", "phoneFailed": "No se pudo consultar el estado de conexión."},
        fr: {"open": "Passer en mode réparation", "description": "L’agent de réparation aide à diagnostiquer et résoudre les problèmes. Entrez, décrivez le problème et envoyez-le.", "opening": "Ouverture de la réparation…", "failed": "Impossible d’ouvrir la réparation. Réessayez.", "phone": "Connecter un téléphone", "phoneManage": "Gérer la connexion du téléphone", "phoneFailed": "Impossible de lire l’état de connexion."},
        de: {"open": "Reparaturmodus öffnen", "description": "Der Reparatur-Agent hilft bei Diagnose und Fehlerbehebung. Öffnen Sie den Modus, beschreiben Sie das Problem und senden Sie es ab.", "opening": "Reparatur wird geöffnet…", "failed": "Reparatur konnte nicht geöffnet werden. Bitte erneut versuchen.", "phone": "Telefon verbinden", "phoneManage": "Telefonverbindung verwalten", "phoneFailed": "Verbindungsstatus konnte nicht gelesen werden."},
        ru: {"open": "Открыть режим восстановления", "description": "Агент восстановления помогает выявлять и устранять проблемы. Откройте режим, опишите проблему и отправьте сообщение.", "opening": "Открытие восстановления…", "failed": "Не удалось открыть восстановление. Повторите попытку.", "phone": "Подключить телефон", "phoneManage": "Управлять подключением телефона", "phoneFailed": "Не удалось получить состояние подключения."},
        pt: {"open": "Entrar no modo de reparo", "description": "O agente de reparo ajuda a diagnosticar e resolver problemas. Entre no modo, descreva o problema e envie quando estiver pronto.", "opening": "Abrindo reparo…", "failed": "Não foi possível abrir o reparo. Tente novamente.", "phone": "Conectar telefone", "phoneManage": "Gerenciar conexão do telefone", "phoneFailed": "Não foi possível consultar o estado da conexão."}
      }))
      const bridge = window.dshDesktop
      if (typeof bridge?.getRepairDraft === 'function') ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({ name: 'conversation.input.dock', id: 'desktop-repair-draft' }, RepairDraft))
      if (typeof bridge?.openRepairAgent === 'function' || typeof bridge?.openMobilePairing === 'function') ctx.slots.inject('sidebar.settings.action', () => ctx.slots.register({ name: 'sidebar.settings.action', id: 'desktop-utilities', locale: REPAIR_NS, inject: () => ({ t: ctx.locale.bind(REPAIR_NS) }) }, DesktopUtilityActions))
    }

    const UPSTREAM_NS = 'dsh-desktop-rendcore-upstreams'
    const upstreamMessages = {
      zh: { title: 'RendCore 上游线路', automatic: '自动（主线路优先）', preference: '首选线路', main: '主线路', backup: '备用线路', current: '最近使用', refresh: '检测线路', close: '关闭', pending: '正在检测或保存…', unknown: '未检测', available: '可用', 'auth-required': '可达，密钥未验证或被拒绝', unavailable: '不可用', error: '操作未完成，请重试。', hint: '首选线路不可用时自动改用备用线路。检测仅检查模型列表。' },
      en: { title: 'RendCore upstreams', automatic: 'Automatic (primary first)', preference: 'Preferred upstream', main: 'Primary', backup: 'Backup', current: 'Last used', refresh: 'Check upstreams', close: 'Close', pending: 'Checking or saving…', unknown: 'Not checked', available: 'Available', 'auth-required': 'Reachable; key unverified or rejected', unavailable: 'Unavailable', error: 'The operation did not complete. Try again.', hint: 'Backups are used if the preferred upstream is unavailable. This check only tests the model list.' }
    }

    const REFRESH_MODELS_NS = 'dsh-desktop-rendcore-models'
    const refreshModelsMessages = {
      zh: {
        button: '刷新可用模型',
        refreshing: '刷新中…',
        updated: '已更新 {count} 个模型',
        unchanged: '已是最新（{count} 个）',
        failed: '刷新失败：{error}'
      },
      en: {
        button: 'Refresh models',
        refreshing: 'Refreshing…',
        updated: 'Updated {count} models',
        unchanged: 'Up to date ({count})',
        failed: 'Refresh failed: {error}'
      }
    }

    function sameModelCatalog(left, right) {
      if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false
      try {
        return JSON.stringify(left) === JSON.stringify(right)
      } catch {
        return false
      }
    }

    function createModelRefreshCoordinator(ctx, t) {
      let state = { busy: false, status: null }
      let inFlight = null
      let feedbackTimer = null
      let disposed = false
      let injectedSettings = null
      const listeners = new Set()

      if (typeof ctx.inject === 'function') {
        ctx.inject(['remote.settings'], (scope) => {
          injectedSettings = scope.remote.settings
          scope.effect(() => () => {
            if (injectedSettings === scope.remote.settings) injectedSettings = null
          })
        })
      }

      const notify = () => {
        for (const listener of listeners) listener(state)
      }

      const setState = (patch) => {
        if (disposed) return
        state = { ...state, ...patch }
        notify()
      }

      const showStatus = (status, timeoutMs) => {
        if (feedbackTimer !== null) clearTimeout(feedbackTimer)
        setState({ status })
        if (status && timeoutMs > 0) {
          feedbackTimer = setTimeout(() => {
            feedbackTimer = null
            setState({ status: null })
          }, timeoutMs)
        }
      }

      const applyModelsToHost = async (models) => {
        const settings = injectedSettings ?? (typeof ctx.get === 'function' ? (ctx.get('remote.settings') ?? ctx.get('remote')?.settings) : ctx.remote?.settings)
        if (typeof settings?.describe !== 'function' || typeof settings?.mutate !== 'function') {
          return { changed: false }
        }
        const writeWithRetry = async (ns, getOps) => {
          for (let attempt = 0; attempt < 2; attempt++) {
            const described = await settings.describe()
            const namespaces = described?.ok ? described.value?.namespaces : described?.namespaces
            if (!Array.isArray(namespaces)) return { changed: false }
            const entry = namespaces.find((item) => item?.ns === ns)
            const ops = getOps(entry)
            if (!ops) return { changed: false }
            const response = await settings.mutate(ns, ops, entry?.revision)
            if (response && response.ok === false) {
              if (response.error?.code === 'settings/conflict' && attempt === 0) continue
              throw new Error(response.error?.message || 'settings write failed')
            }
            return { changed: true }
          }
          return { changed: false }
        }

        const llmResult = await writeWithRetry('llm-pi-ai', (entry) => {
          const current = entry?.value?.providers?.rendcore?.models
          if (!entry?.value?.providers?.rendcore) return null
          if (sameModelCatalog(current, models)) return null
          return [{ op: 'set', path: ['providers', 'rendcore', 'models'], value: models }]
        })

        try {
          await writeWithRetry('agent-default-model', (entry) => {
            if (entry?.applies === false) return null
            const val = entry?.value
            if (val?.provider !== 'rendcore' || typeof val?.model !== 'string') return null
            if (models.some((model) => model.id === val.model)) return null
            const fallback = models.some((model) => model.id === 'gpt-6.1-sol') ? 'gpt-6.1-sol' : models[0]?.id
            if (!fallback) return null
            return [{ op: 'set', path: ['model'], value: fallback }]
          })
        } catch {
          // Best-effort: a user or overlay patch may pin agent-default-model; llm-pi-ai is already updated.
        }

        return llmResult
      }

      const refresh = (reason = 'manual') => {
        if (inFlight) return inFlight
        const bridge = window.dshDesktop
        if (typeof bridge?.refreshRendCoreModels !== 'function') return Promise.resolve({ ok: false, models: [] })
        inFlight = (async () => {
          setState({ busy: true, ...(reason === 'manual' ? { status: null } : {}) })
          try {
            const result = await bridge.refreshRendCoreModels()
            if (!result?.ok || !Array.isArray(result.models) || result.models.length === 0) {
              if (reason === 'manual') {
                showStatus({ kind: 'err', text: t('failed', { error: result?.error || 'unavailable' }) }, 5000)
              }
              return result
            }
            const applied = result.applied === true
              ? { changed: result.changed !== false }
              : await applyModelsToHost(result.models)
            if (reason === 'manual') {
              showStatus({
                kind: 'ok',
                text: t(applied.changed ? 'updated' : 'unchanged', { count: String(result.models.length) })
              }, 3500)
            }
            return result
          } catch (error) {
            if (reason === 'manual') {
              const msg = error instanceof Error ? error.message : String(error)
              showStatus({ kind: 'err', text: t('failed', { error: msg }) }, 5000)
            }
            return { ok: false, models: [] }
          } finally {
            inFlight = null
            setState({ busy: false })
          }
        })()
        return inFlight
      }

      return {
        getSnapshot: () => state,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        refresh,
        dispose: () => {
          disposed = true
          if (feedbackTimer !== null) {
            clearTimeout(feedbackTimer)
            feedbackTimer = null
          }
          listeners.clear()
        }
      }
    }

    function RefreshModelsIcon({ spinning }) {
      return React.createElement(
        'svg',
        {
          width: 13,
          height: 13,
          viewBox: '0 0 16 16',
          fill: 'none',
          'aria-hidden': 'true',
          className: spinning ? 'dshDesktopRefreshSpin' : undefined
        },
        React.createElement('path', {
          d: 'M13.5 8a5.5 5.5 0 1 1-1.35-3.6M13.5 2.75v2.5H11',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round'
        })
      )
    }

    function RendCoreRefreshModelsButton({ t, coordinator }) {
      const [snapshot, setSnapshot] = React.useState(() => coordinator.getSnapshot())
      React.useEffect(() => {
        setSnapshot(coordinator.getSnapshot())
        return coordinator.subscribe(setSnapshot)
      }, [coordinator])
      const h = React.createElement
      return h(
        'div',
        { className: 'dshDesktopRefreshModelsWrap' },
        snapshot.status && h('span', {
          className: 'dshDesktopRefreshStatus',
          'data-kind': snapshot.status.kind,
          role: snapshot.status.kind === 'err' ? 'alert' : 'status'
        }, snapshot.status.text),
        h(
          'button',
          {
            type: 'button',
            className: 'dshDesktopRefreshModels',
            'data-rendcore-refresh-models': 'true',
            disabled: snapshot.busy,
            title: snapshot.status?.text || t('button'),
            onClick: () => { void coordinator.refresh('manual') }
          },
          h(RefreshModelsIcon, { spinning: snapshot.busy }),
          h('span', null, snapshot.busy ? t('refreshing') : t('button'))
        )
      )
    }

    function RendCoreUpstreamsEntry({ t, onPreferenceSaved }) {
      const bridge = window.dshDesktop?.rendcoreUpstreams
      const [open, setOpen] = React.useState(false)
      const [state, setState] = React.useState(null)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(false)
      const generation = React.useRef(0)
      React.useEffect(() => () => { generation.current++ }, [])
      if (!bridge) return null
      const { Modal, Button } = require('@deepseek-ai/dsh-client-ui-primitives')
      const run = async (operation) => {
        const ticket = ++generation.current
        setBusy(true); setError(false)
        try {
          const result = await operation()
          if (ticket === generation.current) setState(result)
        } catch {
          if (ticket === generation.current) setError(true)
        } finally {
          if (ticket === generation.current) setBusy(false)
        }
      }
      const h = React.createElement
      const close = () => { if (!busy) setOpen(false) }
      return h(React.Fragment, null,
        h(Button, { variant: 'outline', onClick: () => {
          setOpen(true)
          void run(async () => {
            setState(await bridge.read())
            return bridge.probe()
          })
        } }, t('title')),
        open && h(Modal, { open, title: t('title'), onClose: close },
          h('p', null, t('hint')),
          state && h('label', null, t('preference'), ' ',
            h('select', { value: state.preferred ?? '', disabled: busy, onChange: event => {
              const preference = event.target.value || null
              void run(async () => {
                const saved = await bridge.save(preference)
                if (typeof onPreferenceSaved === 'function') void onPreferenceSaved()
                return { ...saved, endpoints: state.endpoints }
              })
            } },
            h('option', { value: '' }, t('automatic')),
            ...state.endpoints.map(({ url }, index) => h('option', { key: url, value: url }, `${t(index === 0 ? 'main' : 'backup')} — ${url}`)))),
          state && h('ul', { style: { overflowWrap: 'anywhere', paddingInlineStart: 20 } }, ...state.endpoints.map(({ url, status }) =>
            h('li', { key: url }, `${url} — ${t(status ?? 'unknown')}${state.selected === url ? ` · ${t('current')}` : ''}`))),
          busy && h('p', { role: 'status' }, t('pending')),
          error && h('p', { role: 'alert' }, t('error')),
          h('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
            h(Button, { variant: 'outline', disabled: busy, onClick: () => run(() => bridge.probe()) }, t('refresh')),
            h(Button, { variant: 'primary', disabled: busy, onClick: close }, t('close')))))
    }


    // Ordinary http(s) clicks inside a conversation follow Settings → General → link opening.
    // Links outside that conversation, modifier clicks, the middle button, and explicit window.open stay with the browser.
    function readHttpLink(value, baseHref) {
      if (typeof value !== 'string' || value === '') return undefined
      try {
        const url = new URL(value, baseHref)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
        if (url.username !== '' || url.password !== '') return undefined
        return url.href
      } catch {
        return undefined
      }
    }

    function configuredLinkDestination(linkOpening, browserAvailable) {
      const opening = linkOpening === 'new-tab' ? 'new-tab' : 'sidebar'
      return opening === 'sidebar' && browserAvailable ? 'sidebar' : 'external'
    }

    function linkClickFollowsSetting(event, baseHref) {
      if (event.defaultPrevented || event.button !== 0) return undefined
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return undefined
      const target = event.target
      const anchor = target !== null && typeof target === 'object' && typeof target.closest === 'function'
        ? target.closest('a[href]')
        : undefined
      if (anchor === undefined || anchor === null || anchor.hasAttribute('download')) return undefined
      return readHttpLink(anchor.getAttribute('href'), baseHref)
    }

    function conversationSessionId(event) {
      const target = event.target
      const root = target !== null && typeof target === 'object' && typeof target.closest === 'function'
        ? target.closest('[data-conversation-session]')
        : undefined
      if (root === undefined || root === null || typeof root.getAttribute !== 'function') return undefined
      const sessionId = root.getAttribute('data-conversation-session')
      return typeof sessionId === 'string' && sessionId !== '' ? sessionId : undefined
    }

    function installConfiguredLinkClicks(ctx) {
      const forms = ctx.configForms
      const sidebar = ctx.sidebarRight
      const tabs = ctx.sidebarRightTabs
      if (forms === undefined || typeof forms.get !== 'function'
        || sidebar === undefined || typeof sidebar.openTabIn !== 'function'
        || tabs === undefined || typeof tabs.get !== 'function') return
      const settings = forms.get('ui-chat')
      if (settings === undefined || typeof settings.getSnapshot !== 'function') return
      ctx.effect(() => {
        if (typeof window.addEventListener !== 'function') return
        // Capture runs before a tool-row link stops the bubble, so search and fetch
        // links use the same setting as markdown. Stopping the event keeps chat
        // from opening the same address again and keeps the row from toggling.
        const onClick = (event) => {
          const url = linkClickFollowsSetting(event, window.location.href)
          if (url === undefined) return
          const sessionId = conversationSessionId(event)
          if (sessionId === undefined) return
          const linkOpening = settings.getSnapshot()?.value?.linkOpening
          const destination = configuredLinkDestination(linkOpening, tabs.get('browser') !== undefined)
          event.preventDefault()
          event.stopPropagation()
          if (destination === 'sidebar') {
            sidebar.openTabIn(sessionId, 'browser', { params: { url }, revealIfOpened: false })
            return
          }
          window.open(url, '_blank', 'noopener,noreferrer')
        }
        window.addEventListener('click', onClick, true)
        return () => window.removeEventListener('click', onClick, true)
      })
    }


    const inject = ['locale', 'slots', 'remote.session', 'sessions', 'uiWorkspace', 'configForms', 'sidebarRight', 'sidebarRightTabs']
    function apply(ctx) {
      installStyles()
      installConfiguredLinkClicks(ctx)
      applyRepair(ctx)
      ctx.effect(() => ctx.locale.register(ACTIONS_NS, actionMessages))
      const actionText = ctx.locale.bind(ACTIONS_NS)
      let modelRefreshCoordinator = null
      if (typeof window.dshDesktop?.refreshRendCoreModels === 'function') {
        ctx.effect(() => ctx.locale.register(REFRESH_MODELS_NS, refreshModelsMessages))
        const refreshText = ctx.locale.bind(REFRESH_MODELS_NS)
        modelRefreshCoordinator = createModelRefreshCoordinator(ctx, refreshText)
        ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
          name: 'conversation.input.right',
          id: 'rendcore-refresh-models',
          order: 100,
          locale: REFRESH_MODELS_NS,
          inject: () => ({ t: refreshText, coordinator: modelRefreshCoordinator })
        }, RendCoreRefreshModelsButton))
        ctx.effect(() => {
          let credentialTimer = null
          const scheduleCredentialRefresh = () => {
            if (credentialTimer !== null) clearTimeout(credentialTimer)
            credentialTimer = setTimeout(() => {
              credentialTimer = null
              void modelRefreshCoordinator.refresh('credential')
            }, 600)
          }
          const subscribeCredentials = (remote) => typeof remote?.$on === 'function'
            ? remote.$on('credentials/reference-updated', (ref) => {
                if (ref === undefined || ref === 'RENDCORE_API_KEY') scheduleCredentialRefresh()
              })
            : undefined
          let unsubscribeCred
          if (typeof ctx.inject === 'function') {
            ctx.inject(['remote'], (scope) => {
              scope.effect(() => subscribeCredentials(scope.remote))
            })
          } else {
            const remote = typeof ctx.get === 'function' ? ctx.get('remote') : ctx.remote
            unsubscribeCred = subscribeCredentials(remote)
          }
          const intervalId = setInterval(() => {
            void modelRefreshCoordinator.refresh('periodic')
          }, 60 * 60 * 1000)
          return () => {
            if (credentialTimer !== null) clearTimeout(credentialTimer)
            clearInterval(intervalId)
            if (typeof unsubscribeCred === 'function') unsubscribeCred()
            modelRefreshCoordinator.dispose()
          }
        })
      }
      if (window.dshDesktop?.rendcoreUpstreams) {
        ctx.effect(() => ctx.locale.register(UPSTREAM_NS, upstreamMessages))
        ctx.slots.inject('settings.sidebar.footer', () => ctx.slots.register({
          name: 'settings.sidebar.footer', id: 'rendcore-upstreams', locale: UPSTREAM_NS,
          inject: () => ({
            t: ctx.locale.bind(UPSTREAM_NS),
            onPreferenceSaved: modelRefreshCoordinator ? () => modelRefreshCoordinator.refresh('upstream') : undefined
          })
        }, RendCoreUpstreamsEntry))
      }

      ctx.effect(() => {
        const id = 'dsh-desktop-preset-toolbar-style'
        if (document.getElementById(id)) return
        const style = document.createElement('style')
        style.id = id
        style.textContent = `${templateControlsCss}
          [data-dsh-sidebar-brand-identity] { display:none !important; }
          /* Third-party plugins (dshmarket, dsh-better-sidebar) draw custom icons via ::before on settings nav rows
             and expect the fallback gear to disappear. rc.4's official sidebar no longer uses a navIcon class;
             keep both the old span wrapper and a direct svg so either structure stays hidden. */
          [data-dsh-market-nav-icon] span[class*="navIcon"],
          [data-dsh-market-nav-icon] svg,
          [data-dsh-better-sidebar-settings-nav] span[class*="navIcon"],
          [data-dsh-better-sidebar-settings-nav] svg { display:none !important; }
          :root { --dsh-page-title-top-spacing:56px; }
          /* Keep Desktop actions beside Settings, without relocating other slot contributions. */
          [data-dsh-sidebar-settings]:has([data-dsh-desktop-utilities]) {
            display:flex; flex-direction:row; align-items:center; gap:4px;
          }
          [data-dsh-sidebar-settings]:has([data-dsh-desktop-utilities]) > [data-dsh-sidebar-settings-content] {
            flex:1; min-width:0;
          }
          [data-dsh-sidebar-settings]:has([data-dsh-desktop-utilities]) > [data-dsh-sidebar-settings-actions] {
            display:flex; flex:none; flex-wrap:nowrap; align-items:center; gap:2px;
          }
          [data-dsh-sidebar-settings]:has([data-dsh-desktop-utilities][data-wide="false"]) {
            flex-direction:column;
          }
          /* Utilities own their button layout; leave other contributions unconstrained. */
          [data-dsh-desktop-utilities] {
            position:relative; display:flex; align-items:center; flex-wrap:nowrap; gap:2px; padding:0;
          }
          [data-dsh-desktop-utilities][data-wide="false"] { justify-content:center; }
          [data-dsh-desktop-utilities] button {
            box-sizing:border-box; appearance:none; -webkit-appearance:none;
            display:inline-flex; align-items:center; justify-content:center; flex:none;
            width:28px; height:30px; padding:0; border:0; border-radius:8px;
            background:transparent; color:var(--dsw-alias-label-secondary); font:inherit; cursor:pointer;
          }
          [data-dsh-desktop-utilities] button:hover:not(:disabled) {
            background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary);
          }
          [data-dsh-desktop-utilities] button:focus-visible {
            outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:2px;
          }
          [data-dsh-desktop-utilities] button:disabled { opacity:.5; cursor:wait; }
          [data-dsh-desktop-utilities] [role=alert] {
            position:absolute; right:0; bottom:100%; width:150px; overflow-wrap:anywhere; font-size:12px; background:var(--dsw-alias-bg-layer-1); z-index:1;
            color:var(--dsw-alias-label-primary);
          }
          /* Top-level page titles align with the sidebar brand row. Keep
             conversation chrome and detail/dialog headers in their own layout. */
          [data-plugin-panel] > header[data-window-drag] {
            padding-top:var(--dsh-page-title-top-spacing);
          }
          [data-dsh-preset-heading] { display:flex; align-items:center; flex-wrap:wrap; gap:12px 16px; }
          [data-dsh-preset-heading] h2 { margin:0; }
          [data-dsh-preset-actions] { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-left:auto; }
          [data-dsh-preset-actions] button { white-space:nowrap; }
          [data-dsh-preset-search] { margin-bottom:16px; }
          [data-dsh-preset-search] input[type=search] {
            box-sizing:border-box; width:100%; min-width:0; height:36px;
            border:1px solid var(--dsw-alias-border-l2); border-radius:10px;
            background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-primary);
            padding:0 12px; font:inherit; font-size:13px;
          }
          [data-dsh-preset-search] input[type=search]::placeholder { color:var(--dsw-alias-label-caption); }
          [data-dsh-preset-search] input[type=search]:focus-visible {
            outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:2px;
            background:var(--dsw-alias-bg-base);
          }
          .dshDesktopRefreshModelsWrap {
            position:relative; display:inline-flex; align-items:center; flex:none; min-width:0;
          }
          .dshDesktopRefreshModels {
            box-sizing:border-box; appearance:none; -webkit-appearance:none;
            display:inline-flex; align-items:center; gap:5px;
            height:28px; padding:0 8px; border:0; border-radius:8px;
            background:transparent; color:var(--dsw-alias-label-secondary);
            font:inherit; font-size:12.5px; line-height:18px; white-space:nowrap; cursor:pointer;
          }
          .dshDesktopRefreshModels:hover:not(:disabled) {
            background:var(--dsw-alias-interactive-bg-hover,var(--dsw-alias-bg-layer-2));
            color:var(--dsw-alias-label-primary);
          }
          .dshDesktopRefreshModels:focus-visible {
            outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:2px;
          }
          .dshDesktopRefreshModels:disabled { opacity:.65; cursor:wait; }
          .dshDesktopRefreshSpin { animation:dshDesktopRefreshSpin .9s linear infinite; }
          .dshDesktopRefreshStatus {
            position:absolute; right:0; bottom:calc(100% + 6px); z-index:20;
            padding:4px 8px; border-radius:6px;
            background:var(--dsw-alias-bg-layer-1,#1e1f22);
            border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.12));
            max-width:min(360px, 70vw); overflow:hidden; text-overflow:ellipsis;
            font-size:12px; line-height:16px; white-space:nowrap; pointer-events:none;
            color:var(--dsw-alias-label-primary);
            box-shadow:var(--dsw-elevation-prominent,0 4px 12px rgba(0,0,0,.28));
          }
          .dshDesktopRefreshStatus[data-kind="err"] { color:#f04438; }
          @keyframes dshDesktopRefreshSpin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        `
        document.head.appendChild(style)
        return () => style.remove()
      })
      ctx.slots.inject('sidebar.brand.mark', () =>
        ctx.slots.inject('sidebar.brand.name', () =>
          ctx.slots.inject('conversation.hero.brand.mark', function* () {
            yield ctx.slots.register({ name: 'sidebar.brand.mark' }, () => React.createElement(DesktopBrandMark))
            yield ctx.slots.register({ name: 'sidebar.brand.name' }, DesktopBrandName)
            yield ctx.slots.register(
              { name: 'conversation.hero.brand.mark' },
              ConversationBrandMark
            )
          })
        )
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-delete-session', locale: ACTIONS_NS,
          order: 900,
          inject: () => ({
            t: actionText,
            deleteSession: (sessionId) => {
              const workspace = ctx.get('uiWorkspace')
              if (!workspace) throw new Error(actionText('workspaceUnavailable'))
              return workspace.deleteSession(sessionId)
            }
          })
        }, DeleteSessionMenuItem)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-open-session-folder', locale: ACTIONS_NS,
          order: 800,
          inject: () => ({
            t: actionText,
            openInFinder: (sessionId) => {
              const cwd = ctx.get('sessions').list.getSnapshot().byId[sessionId]?.cwd
              if (!cwd) throw new Error(actionText('directoryUnavailable'))
              return window.dshDesktop.openInFinder(cwd)
            }
          })
        }, OpenSessionFolderMenuItem)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-unread-session', locale: ACTIONS_NS,
          inject: () => ({ t: actionText }),
          order: 350
        }, UnreadSessionMenuItem)
      )
    }

    exports.TemplateLibraryControls = TemplateLibraryControls
    exports.apply = apply
    exports.inject = inject
    exports.readHttpLink = readHttpLink
    exports.configuredLinkDestination = configuredLinkDestination
    exports.linkClickFollowsSetting = linkClickFollowsSetting
    exports.conversationSessionId = conversationSessionId
    return module.exports
  }
})
