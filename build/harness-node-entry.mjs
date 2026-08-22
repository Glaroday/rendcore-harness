import { pathToFileURL } from 'node:url'

// Child processes launched from Electron on macOS must run in Node mode;
// bundled Node hosts on Windows and Linux do not need this switch.
if (process.versions.electron !== undefined) {
  process.env.ELECTRON_RUN_AS_NODE = '1'
}

const [dshEntryPath, ...dshArguments] = process.argv.slice(2)

function report(label, value) {
  process.stderr.write(`[harness-node] ${label}: ${value}\n`)
}

process.on('uncaughtException', (error) => report('uncaught exception', error?.stack ?? error))
process.on('unhandledRejection', (error) => report('unhandled rejection', error?.stack ?? error))

process.stdout.write(
  `[harness-node] runtime node=${process.version} platform=${process.platform} arch=${process.arch}\n`
)
process.stdout.write(`[harness-node] execPath=${process.execPath}\n`)
process.stdout.write(`[harness-node] cwd=${process.cwd()}\n`)
process.stdout.write(`[harness-node] DSH_HOME=${process.env.DSH_HOME ?? ''}\n`)

if (!dshEntryPath) {
  report('startup error', 'missing DSH entry path')
  process.exitCode = 1
} else {
  process.stdout.write(`[harness-node] loading=${dshEntryPath}\n`)
  process.argv = [process.execPath, dshEntryPath, ...dshArguments]
  try {
    await import(pathToFileURL(dshEntryPath).href)
    process.stdout.write('[harness-node] DSH entry loaded\n')
  } catch (error) {
    report('DSH entry failed', error?.stack ?? error)
    process.exitCode = 1
  }
}
