import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

// The desktop and the Harness boot cover share the same RendCore mark.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const icon = await readFile(path.join(root, 'build/app-icon.png'))
const mark = await sharp(icon).resize(250, 250, { fit: 'contain' }).png().toBuffer()
const gif = await sharp({ create: { width: 640, height: 360, channels: 4, background: '#00000000' } })
  .composite([{ input: mark, gravity: 'centre' }]).gif().toBuffer()
for (const name of ['dsh-loader.gif', 'dsh-loader-dark.gif', 'startup-whale.gif']) {
  const destination = path.join(root, 'build', name)
  const temporary = `${destination}.tmp`
  await writeFile(temporary, gif)
  await (await import('node:fs/promises')).rename(temporary, destination)
  console.log(`Wrote ${name} from the RendCore app icon`)
}
