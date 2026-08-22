import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(projectRoot, 'build', 'app-icon.png')
const destinationDirectory = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-web-frontend',
  'dist'
)
const destination = path.join(destinationDirectory, 'dsh-desktop-logo.png')
const lightDestination = path.join(destinationDirectory, 'dsh-desktop-logo-light.png')
const darkDestination = path.join(destinationDirectory, 'dsh-desktop-logo-dark.png')
const indexPath = path.join(destinationDirectory, 'index.html')
const manifestPath = path.join(destinationDirectory, 'manifest.webmanifest')
const frontendScriptPath = path.join(destinationDirectory, 'assets', 'index-ClqxG24t.js')
const conversationClientPath = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-conversation',
  'lib',
  'client.js'
)
const officialBrandClientPath = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-brand-official',
  'lib',
  'client.js'
)
const settingsModelsPath = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-settings-models',
  'lib',
  'client.js'
)
const piAiCompletionsPath = path.join(
  projectRoot,
  'node_modules',
  '@earendil-works',
  'pi-ai',
  'dist',
  'api',
  'openai-completions.js'
)

function replaceRequired(contents, search, replacement, file) {
  if (contents.includes(replacement)) return contents
  if (!contents.includes(search)) {
    throw new Error(`Could not update RendCore Harness branding in ${file}: expected content was not found`)
  }
  return contents.replace(search, replacement)
}

await mkdir(destinationDirectory, { recursive: true })
await copyFile(source, destination)
await copyFile(source, lightDestination)
await copyFile(source, darkDestination)

const index = await readFile(indexPath, 'utf8')
let brandedIndex = replaceRequired(
  index,
  '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
  '<link rel="icon" type="image/png" href="/dsh-desktop-logo.png" />',
  path.relative(projectRoot, indexPath)
)
brandedIndex = brandedIndex.replace('<title>DeepSeek Harness</title>', '<title>RendCore Harness</title>')
await writeFile(indexPath, brandedIndex)

const manifest = await readFile(manifestPath, 'utf8')
let brandedManifest = replaceRequired(
  manifest,
  '"src": "/favicon.svg",\n      "sizes": "any",\n      "type": "image/svg+xml"',
  '"src": "/dsh-desktop-logo.png",\n      "sizes": "1254x1254",\n      "type": "image/png"',
  path.relative(projectRoot, manifestPath)
)
brandedManifest = brandedManifest.replace('"name": "DeepSeek Harness"', '"name": "RendCore Harness"')
brandedManifest = brandedManifest.replace('"short_name": "DSH"', '"short_name": "RendCore"')
await writeFile(manifestPath, brandedManifest)

if (await fileExists(frontendScriptPath)) {
  const frontendScript = await readFile(frontendScriptPath, 'utf8')
  const brandedScript = frontendScript.replace(
    'this.wordmark=Jt(Gt.wordmark,"HARNESS")',
    'this.wordmark=Jt(Gt.wordmark,"LQY")'
  )
  if (brandedScript !== frontendScript) await writeFile(frontendScriptPath, brandedScript)
}

if (await fileExists(conversationClientPath)) {
  const conversationClient = await readFile(conversationClientPath, 'utf8')
  const fishFallback = /\(0, react_jsx_runtime\.jsx\)\(_deepseek_ai_dsh_client_ui_primitives\.FishLogo, \{\n\s*size: 34,\n\s*className: HeroShell_module_css_default\.fish\n\s*\}\)/
  const logoFallback = `(0, react_jsx_runtime.jsx)("img", {
\t\t\t\t\t\t\t\t\t\t\tsrc: "/dsh-desktop-logo.png",
\t\t\t\t\t\t\t\t\t\t\talt: "LQY",
\t\t\t\t\t\t\t\t\t\t\twidth: 34,
\t\t\t\t\t\t\t\t\t\t\theight: 34,
\t\t\t\t\t\t\t\t\t\t\tclassName: HeroShell_module_css_default.fish
\t\t\t\t\t\t\t\t\t\t})`
  const brandedConversation = conversationClient.replace(fishFallback, logoFallback)
  if (brandedConversation !== conversationClient) await writeFile(conversationClientPath, brandedConversation)
}

if (await fileExists(officialBrandClientPath)) {
  const officialBrandClient = await readFile(officialBrandClientPath, 'utf8')
  const whaleMark = /\(0, react_jsx_runtime\.jsx\)\(_deepseek_ai_dsh_client_ui_primitives\.FishLogo, \{\n\s*size,\n\s*className\n\s*\}\)/
  const lqyMark = `(0, react_jsx_runtime.jsx)("img", {
\t\t\t\t\t\tsrc: "/dsh-desktop-logo.png",
\t\t\t\t\t\talt: "LQY",
\t\t\t\t\t\twidth: size,
\t\t\t\t\t\theight: size,
\t\t\t\t\t\tclassName
\t\t\t\t\t})`
  const brandedOfficial = officialBrandClient.replace(whaleMark, lqyMark)
  if (brandedOfficial !== officialBrandClient) await writeFile(officialBrandClientPath, brandedOfficial)
}

if (await fileExists(settingsModelsPath)) {
  const settingsModels = await readFile(settingsModelsPath, 'utf8')
const brandedModels = settingsModels
    .replaceAll('DeepSeek Harness', 'RendCore Harness')
    .replaceAll('DSH plugin ecosystem', 'RendCore plugin ecosystem')
    .replaceAll('DSH 插件生态', 'RendCore 插件生态')
  if (brandedModels !== settingsModels) await writeFile(settingsModelsPath, brandedModels)
}

if (await fileExists(piAiCompletionsPath)) {
  const piAiCompletions = await readFile(piAiCompletionsPath, 'utf8')
  const strictFinishCheck = 'if (!hasFinishReason) {\n                throw new Error("Stream ended without finish_reason");\n            }'
  const compatibleFinishCheck = `if (!hasFinishReason) {
                // RendCore's upstream gateway may close a successful SSE stream with
                // [DONE] but omit the final choice.finish_reason (notably muse-spark).
                // Treat that clean EOF as a normal stop only for this provider; keep
                // the strict validation for every other OpenAI-compatible provider.
                if (model.provider === "rendcore" && output.content.length > 0) {
                    output.stopReason = "stop";
                    hasFinishReason = true;
                }
                else {
                    throw new Error("Stream ended without finish_reason");
                }
            }}`
  if (!piAiCompletions.includes('model.provider === "rendcore"')) {
    if (!piAiCompletions.includes(strictFinishCheck)) {
      throw new Error(`Could not update RendCore stream compatibility in ${path.relative(projectRoot, piAiCompletionsPath)}`)
    }
    await writeFile(piAiCompletionsPath, piAiCompletions.replace(strictFinishCheck, compatibleFinishCheck.slice(0, -1)))
  }
}

console.log(`Installed RendCore Harness brand assets: ${[
  destination,
  lightDestination,
  darkDestination
].map((file) => path.relative(projectRoot, file)).join(', ')}`)

async function fileExists(file) {
  try {
    await readFile(file)
    return true
  } catch {
    return false
  }
}
