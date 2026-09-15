import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFriendLinkPath } from './friendLinkUrl'

test('buildFriendLinkPath: 実在する LIFF friend-link ページのパスを組み立てる', () => {
  assert.equal(buildFriendLinkPath('tok123'), '/liff/friend-link/tok123')
})

test('buildFriendLinkPath: 廃止された /line-friend-invite パスを使わない', () => {
  assert.equal(buildFriendLinkPath('tok123').includes('/line-friend-invite'), false)
})
