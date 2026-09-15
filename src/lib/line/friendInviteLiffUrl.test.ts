import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFriendInviteLiffUrl } from './friendInviteLiffUrl'

test('buildFriendInviteLiffUrl: トークンをパスセグメントに含む liff.line.me URL を組み立てる', () => {
  assert.equal(
    buildFriendInviteLiffUrl('1234567890-abcdEFGH', 'tok_ABC123'),
    'https://liff.line.me/1234567890-abcdEFGH/friend-link/tok_ABC123'
  )
})

test('buildFriendInviteLiffUrl: トークン内の特殊文字を URL エンコードする', () => {
  assert.equal(
    buildFriendInviteLiffUrl('liff-id', 'a+b/c='),
    'https://liff.line.me/liff-id/friend-link/a%2Bb%2Fc%3D'
  )
})
