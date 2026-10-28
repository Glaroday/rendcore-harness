import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

describe('RendCore startup assets', () => {
  it('ships the app icon for both themes rather than the upstream whale', async () => {
    const dir = resolve('build')
    const icon = await readFile(resolve(dir, 'app-icon.png'))
    const mark = await sharp(icon).resize(250, 250, { fit: 'contain' }).png().toBuffer()
    const expected = await sharp({ create: { width: 640, height: 360, channels: 4, background: '#00000000' } })
      .composite([{ input: mark, gravity: 'centre' }]).gif().toBuffer()
    const light = await readFile(resolve(dir, 'dsh-loader.gif'))
    const dark = await readFile(resolve(dir, 'dsh-loader-dark.gif'))
    const whale = await readFile(resolve(dir, 'startup-whale.gif'))
    expect(light.equals(expected)).toBe(true)
    expect(dark.equals(expected)).toBe(true)
    expect(dark.equals(whale)).toBe(false)
  })
})
