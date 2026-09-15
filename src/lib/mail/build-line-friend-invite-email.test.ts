import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFriendInviteEmail } from './build-line-friend-invite-email'

const inviteUrl = 'https://example.test/p/line-friend-invite/tok123'

test('buildFriendInviteEmail: 件名にテナント名を含む', () => {
  const { subject } = buildFriendInviteEmail({
    tenantName: 'サンプル商事',
    adminName: '山田太郎',
    inviteUrl,
  })
  assert.equal(subject.includes('サンプル商事'), true)
})

test('buildFriendInviteEmail: 本文は管理者（ユーザ名）より、の形式', () => {
  const { html } = buildFriendInviteEmail({
    tenantName: 'サンプル商事',
    adminName: '山田太郎',
    inviteUrl,
  })
  assert.equal(html.includes('管理者（山田太郎）より、'), true)
  assert.equal(html.includes('サンプル商事の管理者より、'), false)
})

test('buildFriendInviteEmail: 管理者名を HTML エスケープする', () => {
  const { html } = buildFriendInviteEmail({
    tenantName: 'サンプル商事',
    adminName: '<script>x</script>',
    inviteUrl,
  })
  assert.equal(html.includes('<script>'), false)
  assert.equal(html.includes('&lt;script&gt;'), true)
})

test('buildFriendInviteEmail: inviteUrl を本文に含む', () => {
  const { html } = buildFriendInviteEmail({
    tenantName: 'サンプル商事',
    adminName: '山田太郎',
    inviteUrl,
  })
  assert.equal(html.includes(inviteUrl), true)
})
