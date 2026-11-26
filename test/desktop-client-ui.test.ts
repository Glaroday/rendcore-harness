import { readFile } from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

interface Registration {
  config: { name: string; id?: string; order?: number }
  component: (props: Record<string, unknown>) => unknown
}

describe('DSH Desktop client slot occupants', () => {
  it('registers one occupant per brand seat and keeps the official name mark-free', async () => {
    const source = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'),
      'utf8'
    )
    expect(source).not.toMatch(/Bisheng|enterprise\.work|dshEnterprise|desktop\.chatWork|remote\.skills|SharedCollection|WorkResource/)
    let definition: {
      factory: (require: (id: string) => unknown) => {
        apply: (ctx: unknown) => void
        inject: string[]
      }
    } | undefined
    const appended: Array<{ textContent?: string }> = []
    const removeStyle = vi.fn()
    let disposeStyle: (() => void) | undefined
    const document = {
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '', remove: removeStyle })),
      head: { appendChild: (node: { textContent?: string }) => appended.push(node) }
    }
    vm.runInNewContext(source, {
      document,
      navigator: { language: 'en-US' },
      window: {
        dshDesktop: { getRepairDraft: vi.fn(), openRepairAgent: vi.fn() },
        __ModuleLoader__: {
          load: (value: typeof definition) => {
            definition = value
          }
        }
      }
    })

    expect(definition).toBeDefined()
    const createElement = (
      type: unknown,
      props: Record<string, unknown> | null,
      ...children: unknown[]
    ): { type: unknown; props: Record<string, unknown> } => ({
      type,
      props: { ...props, children }
    })
    const BrandWordmark = vi.fn()
    const plugin = definition!.factory((id) => {
      if (id === 'react') {
        return {
          createElement,
          useEffect: (effect: () => void | (() => void)) => effect(),
          useState: (initial: unknown) => [initial, vi.fn()]
        }
      }
      if (id === '@deepseek-ai/dsh-client-ui-primitives') {
        return { BrandWordmark }
      }
      throw new Error(`Unexpected client dependency: ${id}`)
    })

    const registrations: Registration[] = []
    const slots = {
      inject: (_name: string, callback: () => unknown): unknown => {
        const result = callback()
        if (result && typeof result === 'object' && Symbol.iterator in result) {
          for (const _entry of result as Iterable<unknown>) void _entry
        }
        return result
      },
      register: (
        config: Registration['config'],
        component: Registration['component']
      ): (() => void) => {
        registrations.push({ config, component })
        return () => undefined
      }
    }
    plugin.apply({ slots, locale: { register: () => () => undefined, bind: () => (key: string) => key }, effect: (setup: () => (() => void) | undefined) => { disposeStyle = setup() } })

    expect(plugin.inject).toEqual(['locale', 'slots', 'remote.session', 'sessions', 'uiWorkspace', 'configForms', 'sidebarRight', 'sidebarRightTabs'])
    expect(registrations.map(({ config }) => config.name)).toEqual([
      'conversation.input.dock',
      'sidebar.settings.action',
      'sidebar.brand.mark',
      'sidebar.brand.name',
      'conversation.hero.brand.mark',
      'sidebar.workspaces.session.menu.item',
      'sidebar.workspaces.session.menu.item',
      'sidebar.workspaces.session.menu.item'
    ])
    expect(registrations.some(({ config }) => config.id === 'desktop-enterprise-entry')).toBe(false)
    // Brand styles install once; the toolbar styles keep an owned lifetime.
    expect(appended).toHaveLength(2)
    expect(appended[0]?.textContent).toContain('.dshDesktopBrandDark')
    expect(appended[1]?.textContent).toContain('[data-dsh-preset-search]')
    disposeStyle?.()
    expect(removeStyle).toHaveBeenCalledOnce()

    const sidebarName = registrations.find(
      ({ config }) => config.name === 'sidebar.brand.name'
    )!.component({}) as { type: unknown; props: Record<string, unknown> }
    expect(sidebarName.type).toBe('span')
    expect(sidebarName.props.children).toEqual(['LQY'])

    const sidebarMarkEl = registrations.find(
      ({ config }) => config.name === 'sidebar.brand.mark'
    )!.component({ size: 24 }) as { type: ((props: Record<string, unknown>) => { type: unknown; props: Record<string, unknown> }) | string; props: Record<string, unknown> }
    const sidebarMark = typeof sidebarMarkEl.type === 'function'
      ? sidebarMarkEl.type(sidebarMarkEl.props)
      : sidebarMarkEl
    expect(sidebarMark.type).toBe('svg')
    expect(sidebarMark.props.height).toBe(17)
    const [lightMark, darkMark] = sidebarMark.props.children as [
      { type: unknown; props: Record<string, unknown> },
      { type: unknown; props: Record<string, unknown> }
    ]
    expect(lightMark.type).toBe('image')
    expect(lightMark.props.href).toBe('/dsh-desktop-logo-light.png')
    expect(darkMark.type).toBe('image')
    expect(darkMark.props.href).toBe('/dsh-desktop-logo-dark.png')

    const heroMark = registrations.find(
      ({ config }) => config.name === 'conversation.hero.brand.mark'
    )!.component({ size: 48 }) as { type: unknown; props: Record<string, unknown> }
    expect(heroMark.type).toBe('img')
    expect(heroMark.props.width).toBe(48)
    expect(heroMark.props.alt).toBe('LQY')
  })

  it('registers the refresh models button beside model select and auto-refreshes on API key change and hourly', async () => {
    vi.useFakeTimers()
    try {
      const source = await readFile(
        path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'),
        'utf8'
      )
      let definition: {
        factory: (require: (id: string) => unknown) => {
          apply: (ctx: unknown) => void
        }
      } | undefined
      const refreshRendCoreModels = vi.fn(async () => ({
        ok: true,
        models: [
          { id: 'glm-5.3', name: 'glm-5.3', contextWindow: 1048576, maxTokens: 131072, input: ['text', 'image'] }
        ]
      }))
      const document = {
        getElementById: vi.fn(() => null),
        createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '', remove: vi.fn() })),
        head: { appendChild: vi.fn() }
      }
      vm.runInNewContext(source, {
        document,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        navigator: { language: 'zh-CN' },
        window: {
          dshDesktop: {
            getRepairDraft: vi.fn(),
            openRepairAgent: vi.fn(),
            refreshRendCoreModels
          },
          __ModuleLoader__: {
            load: (value: typeof definition) => {
              definition = value
            }
          }
        }
      })

      const createElement = (
        type: unknown,
        props: Record<string, unknown> | null,
        ...children: unknown[]
      ): { type: unknown; props: Record<string, unknown> } => ({
        type,
        props: { ...props, children }
      })
      const plugin = definition!.factory((id) => {
        if (id === 'react') {
          return {
            createElement,
            Fragment: 'Fragment',
            useEffect: (effect: () => void | (() => void)) => effect(),
            useState: (initial: unknown) => [typeof initial === 'function' ? (initial as () => unknown)() : initial, vi.fn()]
          }
        }
        if (id === '@deepseek-ai/dsh-client-ui-primitives') {
          return { BrandWordmark: vi.fn(), FishLogo: vi.fn(), MenuItemButton: vi.fn(), Tooltip: vi.fn() }
        }
        throw new Error(`Unexpected client dependency: ${id}`)
      })

      const registrations: Array<{ config: { name: string; id?: string; inject?: () => Record<string, unknown> }; component: (props: Record<string, unknown>) => unknown }> = []
      const slots = {
        inject: (_name: string, callback: () => unknown): unknown => {
          const result = callback()
          if (result && typeof result === 'object' && Symbol.iterator in result) {
            for (const _entry of result as Iterable<unknown>) void _entry
          }
          return result
        },
        register: (
          config: { name: string; id?: string; inject?: () => Record<string, unknown> },
          component: (props: Record<string, unknown>) => unknown
        ) => {
          registrations.push({ config, component })
          return () => undefined
        }
      }
      const listeners = new Map<string, Array<(payload?: unknown) => void>>()
      const mutate = vi.fn(async () => ({ ok: true, value: { revision: 2 } }))
      const describe = vi.fn(async () => ({
        ok: true,
        value: {
          namespaces: [
            { ns: 'llm-pi-ai', revision: 1, value: { providers: { rendcore: { models: [{ id: 'old-model' }] } } } },
            { ns: 'agent-default-model', revision: 1, value: { provider: 'rendcore', model: 'old-model' } }
          ]
        }
      }))
      const remoteObj = {
        $on: (event: string, listener: (payload?: unknown) => void) => {
          const list = listeners.get(event) ?? []
          list.push(listener)
          listeners.set(event, list)
          return () => {}
        },
        settings: { describe, mutate }
      }
      const cleanups: Array<() => void> = []
      plugin.apply({
        slots,
        locale: { register: () => () => undefined, bind: () => (key: string) => key },
        effect: (setup: () => (() => void) | undefined) => {
          const dispose = setup()
          if (typeof dispose === 'function') cleanups.push(dispose)
        },
        get: (name: string) => (name === 'remote' ? remoteObj : undefined)
      })

      const refreshEntry = registrations.find(({ config }) => config.name === 'conversation.input.right' && config.id === 'rendcore-refresh-models')
      expect(refreshEntry).toBeDefined()
      const injectedProps = refreshEntry!.config.inject!()
      const tree = refreshEntry!.component(injectedProps) as { props: { children: unknown[] } }
      const button = tree.props.children.find(
        (node): node is { type: string; props: { onClick: () => void; 'data-rendcore-refresh-models'?: string } } =>
          Boolean(node && typeof node === 'object' && 'props' in node && (node as { props?: { 'data-rendcore-refresh-models'?: string } }).props?.['data-rendcore-refresh-models'] === 'true')
      )
      expect(button).toBeDefined()

      // 1) Manual click refreshes and live-updates llm-pi-ai + agent-default-model
      button!.props.onClick()
      await vi.advanceTimersByTimeAsync(10)
      expect(refreshRendCoreModels).toHaveBeenCalledTimes(1)
      expect(mutate).toHaveBeenCalledWith(
        'llm-pi-ai',
        [{ op: 'set', path: ['providers', 'rendcore', 'models'], value: [{ id: 'glm-5.3', name: 'glm-5.3', contextWindow: 1048576, maxTokens: 131072, input: ['text', 'image'] }] }],
        1
      )
      expect(mutate).toHaveBeenCalledWith(
        'agent-default-model',
        [{ op: 'set', path: ['model'], value: 'glm-5.3' }],
        1
      )

      // 2) Updating RENDCORE_API_KEY auto-refreshes after debounce (ignores unrelated keys)
      for (const listener of listeners.get('credentials/reference-updated') ?? []) listener('OTHER_KEY')
      await vi.advanceTimersByTimeAsync(1000)
      expect(refreshRendCoreModels).toHaveBeenCalledTimes(1)

      for (const listener of listeners.get('credentials/reference-updated') ?? []) listener('RENDCORE_API_KEY')
      await vi.advanceTimersByTimeAsync(650)
      expect(refreshRendCoreModels).toHaveBeenCalledTimes(2)

      // 3) Hourly periodic refresh while open
      await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
      expect(refreshRendCoreModels).toHaveBeenCalledTimes(3)

      for (const dispose of cleanups) dispose()
    } finally {
      vi.useRealTimers()
    }
  })

  it('boots cleanly inside a real Cordis Context without throwing on ctx.remote', async () => {
    const source = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'),
      'utf8'
    )
    let definition: {
      factory: (require: (id: string) => unknown) => {
        apply: (ctx: unknown) => void
        inject: string[]
      }
    } | undefined
    const document = {
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '', remove: vi.fn() })),
      head: { appendChild: vi.fn() }
    }
    vm.runInNewContext(source, {
      document,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      navigator: { language: 'zh-CN' },
      window: {
        dshDesktop: {
          getRepairDraft: vi.fn(),
          openRepairAgent: vi.fn(),
          rendcoreUpstreams: { read: vi.fn(), probe: vi.fn(), save: vi.fn() },
          refreshRendCoreModels: vi.fn(async () => ({ ok: true, models: [{ id: 'glm-5.3', name: 'glm-5.3', input: ['text', 'image'] }] }))
        },
        __ModuleLoader__: {
          load: (value: typeof definition) => {
            definition = value
          }
        }
      }
    })
    const plugin = definition!.factory((id) => {
      if (id === 'react') {
        return {
          createElement: vi.fn(),
          Fragment: 'Fragment',
          useEffect: vi.fn(),
          useState: (initial: unknown) => [initial, vi.fn()]
        }
      }
      if (id === '@deepseek-ai/dsh-client-ui-primitives') {
        return { BrandWordmark: vi.fn(), FishLogo: vi.fn(), MenuItemButton: vi.fn(), Tooltip: vi.fn() }
      }
      throw new Error(`Unexpected client dependency: ${id}`)
    })

    const root = new Context()
    const registered: Array<{ config: { name: string; id?: string; inject?: () => Record<string, unknown> }; component: (props: Record<string, unknown>) => unknown }> = []
    const mutate = vi.fn(async (ns: string) => {
      if (ns === 'agent-default-model') {
        return { ok: false, error: { code: 'settings/rejected', message: 'Configuration for "agent-default-model" is overridden by a home patch or command-line overlay' } }
      }
      return { ok: true, value: { revision: 2 } }
    })
    const describe = vi.fn(async () => ({
      ok: true,
      value: {
        namespaces: [
          { ns: 'llm-pi-ai', revision: 1, value: { providers: { rendcore: { models: [{ id: 'old' }] } } } }
        ]
      }
    }))
    root.provide('locale', { register: () => () => undefined, bind: () => (key: string) => key } as never)
    root.provide('slots', {
      inject: (_name: string, cb: () => unknown) => cb(),
      register: (config: { name: string; id?: string; inject?: () => Record<string, unknown> }, component: (props: Record<string, unknown>) => unknown) => {
        registered.push({ config, component })
        return () => undefined
      }
    } as never)
    root.provide('remote', {
      $on: vi.fn(() => () => undefined)
    } as never)
    root.provide('remote.session', { openWorkspacePath: vi.fn() } as never)
    root.provide('remote.settings', { describe, mutate } as never)
    root.provide('sessions', { list: { getSnapshot: () => ({ byId: {} }) } } as never)
    root.provide('uiWorkspace', { deleteSession: vi.fn() } as never)
    root.provide('configForms', { get: () => undefined } as never)
    root.provide('sidebarRight', { openTabIn: vi.fn() } as never)
    root.provide('sidebarRightTabs', { get: () => undefined } as never)
    const fiber = root.plugin(plugin)
    await fiber
    const entry = registered.find((row) => row.config.name === 'conversation.input.right')
    expect(entry).toBeDefined()
    const props = entry!.config.inject!()
    const { coordinator } = props as { coordinator: { refresh: (reason: string) => Promise<unknown> } }
    const outcome = await coordinator.refresh('manual') as { ok: boolean }
    expect(outcome.ok).toBe(true)
    expect((coordinator as unknown as { getSnapshot: () => { status: { kind: string } | null } }).getSnapshot().status?.kind).toBe('ok')
    expect(describe).toHaveBeenCalled()
    expect(mutate).toHaveBeenCalled()
    await fiber.dispose()
  })

  it('uses host-applied reload result without calling remote.settings.mutate', async () => {
    const source = await readFile(path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'), 'utf8')
    let definition: { id: string; factory: (req: (id: string) => unknown) => { inject?: string[]; apply: (ctx: unknown) => void } } | undefined
    const document = {
      getElementById: vi.fn(() => null),
      createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '', remove: vi.fn() })),
      head: { appendChild: vi.fn() }
    }
    const refreshRendCoreModels = vi.fn(async () => ({
      ok: true,
      applied: true,
      changed: true,
      models: [{ id: 'gemini-4-neon', name: 'gemini-4-neon', contextWindow: 1048576, maxTokens: 65536, input: ['text', 'image'] }]
    }))
    vm.runInNewContext(source, {
      document,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      navigator: { language: 'zh-CN' },
      window: {
        dshDesktop: {
          getRepairDraft: vi.fn(),
          openRepairAgent: vi.fn(),
          rendcoreUpstreams: { read: vi.fn(), probe: vi.fn(), save: vi.fn() },
          refreshRendCoreModels
        },
        __ModuleLoader__: {
          load: (value: typeof definition) => {
            definition = value
          }
        }
      }
    })
    const plugin = definition!.factory((id) => {
      if (id === 'react') {
        return {
          createElement: vi.fn(),
          Fragment: 'Fragment',
          useEffect: vi.fn(),
          useState: (initial: unknown) => [initial, vi.fn()]
        }
      }
      if (id === '@deepseek-ai/dsh-client-ui-primitives') {
        return { BrandWordmark: vi.fn(), FishLogo: vi.fn(), MenuItemButton: vi.fn(), Tooltip: vi.fn() }
      }
      throw new Error(`Unexpected client dependency: ${id}`)
    })

    const root = new Context()
    const registered: Array<{ config: { name: string; id?: string; inject?: () => Record<string, unknown> }; component: (props: Record<string, unknown>) => unknown }> = []
    const describe = vi.fn(async () => ({ ok: true, value: { namespaces: [] } }))
    const mutate = vi.fn(async () => ({ ok: false, error: { code: 'settings/rejected', message: 'should not be called' } }))
    root.provide('locale', { register: () => () => undefined, bind: () => (key: string, params?: Record<string, string>) => `${key}:${params?.count ?? ''}` } as never)
    root.provide('slots', {
      inject: (_name: string, cb: () => unknown) => cb(),
      register: (config: { name: string; id?: string; inject?: () => Record<string, unknown> }, component: (props: Record<string, unknown>) => unknown) => {
        registered.push({ config, component })
        return () => undefined
      }
    } as never)
    root.provide('remote', { $on: vi.fn(() => () => undefined) } as never)
    root.provide('remote.session', { openWorkspacePath: vi.fn() } as never)
    root.provide('remote.settings', { describe, mutate } as never)
    root.provide('sessions', { list: { getSnapshot: () => ({ byId: {} }) } } as never)
    root.provide('uiWorkspace', { deleteSession: vi.fn() } as never)
    root.provide('configForms', { get: () => undefined } as never)
    root.provide('sidebarRight', { openTabIn: vi.fn() } as never)
    root.provide('sidebarRightTabs', { get: () => undefined } as never)
    const fiber = root.plugin(plugin)
    await fiber
    const entry = registered.find((row) => row.config.name === 'conversation.input.right')
    const { coordinator } = entry!.config.inject!() as {
      coordinator: { refresh: (reason: string) => Promise<unknown>; getSnapshot: () => { status: { kind: string; text: string } | null } }
    }
    await coordinator.refresh('manual')
    expect(describe).not.toHaveBeenCalled()
    expect(mutate).not.toHaveBeenCalled()
    expect(coordinator.getSnapshot().status).toEqual({ kind: 'ok', text: 'updated:1' })
    await fiber.dispose()
  })
})
