import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('DSH Desktop sidebar branding', () => {

  it('uses upstream platform-aware collapsed titlebar spacing', async () => {
    const client = await readFile(
      path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js'),
      'utf8'
    )

    expect(client).toContain('document.documentElement.dataset.platform === "darwin"')
    expect(client).toContain('document.documentElement.hasAttribute("data-windows-titlebar") ? 0 : 56')
    expect(client).toContain('sidebar === 0 ? collapsedWidth')
  })

  it('fills the stock brand slots with the RendCore logo', async () => {
    const [client, composition] = await Promise.all([
      readFile(path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'), 'utf8'),
      readFile(path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'), 'utf8')
    ])

    expect(client).toContain("ctx.slots.inject('sidebar.brand.mark'")
    expect(client).toContain("ctx.slots.inject('sidebar.brand.name'")
    expect(client).toContain("ctx.slots.inject('conversation.hero.brand.mark'")
    expect(client).toContain("React.createElement('span', { style: { fontWeight: 600 } }, 'LQY')")
    expect(client).toContain("React.createElement('img'")
    expect(client).toContain('/dsh-desktop-logo-light.png')
    expect(client).toContain('/dsh-desktop-logo-dark.png')
    const normalizedComposition = composition.replaceAll('\r\n', '\n')
    expect(normalizedComposition).toMatch(/- id: ui-brand-official\n  disabled: true/u)
    expect(normalizedComposition).toMatch(
      /- id: dsh-desktop-client-ui\n      name: dsh-desktop-client-ui/u
    )
  })

  it('installs the source logo into the Harness static frontend', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts: { postinstall: string } }
    const installer = await readFile(
      path.join(projectRoot, 'scripts', 'install-brand-assets.mjs'),
      'utf8'
    )

    expect(packageJson.scripts.postinstall).toContain('node scripts/install-brand-assets.mjs')
    expect(installer).toContain("'build', 'app-icon.png'")
    expect(installer).toContain("'dsh-desktop-logo.png'")
    expect(installer).toContain("'dsh-desktop-logo-light.png'")
    expect(installer).toContain("'dsh-desktop-logo-dark.png'")
    expect(installer).toContain('<link rel="icon" type="image/png" href="/dsh-desktop-logo.png" />')
    expect(installer).toContain("target.src = '/dsh-desktop-logo.png'")
    expect(installer).toContain("target.sizes = '1254x1254'")
  })
})
