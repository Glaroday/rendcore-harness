import { cp, mkdtemp, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const nodePtyRoot = dirname(require.resolve('node-pty/package.json'))

type Pty = {
  onData(listener: (data: string) => void): void
  onExit(listener: (event: { exitCode: number }) => void): void
}
type NodePty = { spawn(file: string, args: string[], options: { cwd: string, env: NodeJS.ProcessEnv }): Pty }

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

// Only macOS launches the shell through node-pty's spawn-helper binary.
describe.runIf(process.platform === 'darwin')('node-pty loaded from app.asar.unpacked', () => {
  it('starts a terminal instead of resolving spawn-helper under app.asar.unpacked.unpacked', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-node-pty-'))
    roots.push(root)
    // Packaged Harness resolves dependencies from this physical directory.
    const unpacked = join(root, 'DSH Desktop.app', 'Contents', 'Resources', 'app.asar.unpacked', 'node_modules', 'node-pty')
    await cp(nodePtyRoot, unpacked, { recursive: true })
    const pty = require(unpacked) as NodePty

    const terminal = pty.spawn('/bin/echo', ['dsh-pty-ok'], { cwd: root, env: process.env })
    let output = ''
    terminal.onData((data) => { output += data })
    const exitCode = await new Promise<number>(resolve => terminal.onExit(({ exitCode }) => resolve(exitCode)))

    expect(exitCode).toBe(0)
    expect(output).toContain('dsh-pty-ok')
  })
})
