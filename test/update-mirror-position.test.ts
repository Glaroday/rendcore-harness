// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { placeUpdateMirrorButton } from '../src/preload/update-mirror-position'

describe('update mirror placement', () => {
  it('mounts once inside the action row and follows a remount', () => {
    const area = document.createElement('div')
    area.innerHTML = '<div data-dsh-sidebar-settings-content></div><div data-dsh-sidebar-settings-actions></div>'
    const button = document.createElement('button')
    placeUpdateMirrorButton(area, button)
    placeUpdateMirrorButton(area, button)
    expect(area.querySelector('[data-dsh-sidebar-settings-actions]')?.contains(button)).toBe(true)
    expect(area.querySelectorAll('button')).toHaveLength(1)
    area.querySelector('[data-dsh-sidebar-settings-actions]')?.remove()
    const replacement = document.createElement('div')
    replacement.setAttribute('data-dsh-sidebar-settings-actions', '')
    area.append(replacement)
    placeUpdateMirrorButton(area, button)
    expect(button.parentElement).toBe(replacement)
  })
  it('falls back to the settings row and uses no absolute positioning', () => {
    const area = document.createElement('div')
    const button = document.createElement('button')
    placeUpdateMirrorButton(area, button)
    expect(button.parentElement).toBe(area)
    const source = readFileSync('src/preload/index.ts', 'utf8')
    expect(source).not.toMatch(/#\$\{UPDATE_SETTINGS_BUTTON_ID\}\s*\{[^}]*position:absolute/)
  })
})
