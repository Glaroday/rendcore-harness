import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import {
  normalizeUpdateFeedUrl,
  parseUpdateFeedConfig,
  readUpdateFeedConfig,
  resetUpdateFeedConfig,
  writeUpdateFeedConfig
} from '../src/main/update/update-feed'

describe('configurable desktop update feeds', () => {
  it('normalizes valid HTTP(S) feed bases and rejects unsafe URLs', () => {
    expect(normalizeUpdateFeedUrl('https://mirror.example/rendcore')).toBe(
      'https://mirror.example/rendcore/'
    )
    expect(normalizeUpdateFeedUrl('http://127.0.0.1:8080/updates/')).toBe(
      'http://127.0.0.1:8080/updates/'
    )
    expect(normalizeUpdateFeedUrl('file:///tmp/updates')).toBeUndefined()
    expect(normalizeUpdateFeedUrl('not a URL')).toBeUndefined()
  })

  it('accepts one feedUrl or an ordered mirrors list', () => {
    expect(
      parseUpdateFeedConfig(
        JSON.stringify({
          feedUrl: 'https://one.example',
          mirrors: ['https://two.example/', 'https://one.example/'],
          fallbackToGitHub: false
        })
      )
    ).toEqual({
      feedUrls: ['https://two.example/', 'https://one.example/'],
      fallbackToGitHub: false
    })
  })

  it('uses the optional config file and environment override without throwing', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rendcore-update-feed-'))
    await writeFile(
      join(root, 'update-config.json'),
      JSON.stringify({ feedUrl: 'https://file.example', fallbackToGitHub: true })
    )

    expect(readUpdateFeedConfig(root, 'https://env.example')).toEqual({
      feedUrls: ['https://env.example/', 'https://file.example/'],
      fallbackToGitHub: true
    })
    expect(readUpdateFeedConfig(join(root, 'missing'), undefined)).toEqual({
      feedUrls: [
        'https://gh-proxy.com/https://github.com/Glaroday/rendcore-harness/releases/latest/download/',
        'https://ghfast.top/https://github.com/Glaroday/rendcore-harness/releases/latest/download/'
      ],
      fallbackToGitHub: true
    })
  })

  it('writes, validates, and resets settings used by the in-app panel', async () => {
    const root = await mkdtemp(join(tmpdir(), 'rendcore-update-feed-write-'))
    const saved = await writeUpdateFeedConfig(root, {
      mirrors: ['https://mirror.example/releases', 'https://mirror.example/releases/'],
      fallbackToGitHub: false
    })
    expect(saved).toEqual({
      feedUrls: ['https://mirror.example/releases/'],
      fallbackToGitHub: false
    })
    expect(JSON.parse(await readFile(join(root, 'update-config.json'), 'utf8'))).toEqual({
      mirrors: ['https://mirror.example/releases/'],
      fallbackToGitHub: false
    })
    await expect(
      writeUpdateFeedConfig(root, { mirrors: ['file:///unsafe'], fallbackToGitHub: true })
    ).rejects.toThrow('valid HTTP(S) URL')
    expect(await resetUpdateFeedConfig(root)).toEqual({
      feedUrls: [
        'https://gh-proxy.com/https://github.com/Glaroday/rendcore-harness/releases/latest/download/',
        'https://ghfast.top/https://github.com/Glaroday/rendcore-harness/releases/latest/download/'
      ],
      fallbackToGitHub: true
    })
  })
})
