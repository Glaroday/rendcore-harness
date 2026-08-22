const packageJson = require('./package.json')

module.exports = {
  ...packageJson.build,
  appId: 'io.rendcore.harness.dev',
  productName: 'RendCore Harness Dev',
  directories: {
    ...packageJson.build.directories,
    output: 'dist-dev'
  },
  extraMetadata: {
    name: 'rendcore-harness-dev',
    productName: 'RendCore Harness Dev',
    dshDesktopChannel: 'development'
  },
  artifactName: 'rendcore-harness-dev-${os}-${arch}.${ext}',
  nsis: {
    ...packageJson.build.nsis,
    artifactName: 'rendcore-harness-dev-windows-${arch}-setup.${ext}'
  },
  publish: null
}
