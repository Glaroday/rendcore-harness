import { mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import {
  normalizeUpdateFeedUrl,
  parseUpdateFeedConfig,
  readUpdateFeedConfig
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
      feedUrls: [],
      fallbackToGitHub: true
    })
  })
})
