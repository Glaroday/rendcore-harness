import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.{test,spec}.{ts,js,mjs}'],
    // Native Intel runners and Windows CI contend for CPU and disk while integration suites
    // unpack archives and launch subprocesses (hitting EBUSY locks). Keep every test, but serialize files.
    // Windows also races on the shared Harness port when two suites boot a real Harness at
    // once, so serialize there unconditionally instead of only under CI.
    fileParallelism: !(
      process.platform === 'win32' ||
      (process.env.CI && process.platform === 'darwin' && process.arch === 'x64')
    ),
    testTimeout: 60_000
  }
})
