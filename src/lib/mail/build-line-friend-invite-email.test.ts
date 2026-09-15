import assert from 'node:assert/strict'
import test from 'node:test'
import { buildFriendInviteEmail } from './build-line-friend-invite-email'

const inviteUrl = 'https://example.test/p/line-friend-invite/tok123'

test('buildFriendInviteEmail: 件名にテナント名を含む', () => {
  const { subject } = buildFriendInviteEmail({
    tenantName: 'サンプル商事',
    inviteUrl,
  })
  assert.equal(subject.includes('サンプル商事'), true)
})

test('buildFriendInviteEmail: テナント名を HTML エスケープする', () => {
  const { html } = buildFriendInviteEmail({
    tenantName: '<script>x</script>',
    inviteUrl,
  })
  assert.equal(html.includes('<script>'), false)
  assert.equal(html.includes('&lt;script&gt;'), true)
})

test('buildFriendInviteEmail: inviteUrl を本文に含む', () => {
  const { html } = buildFriendInviteEmail({
    tenantName: 'サンプル商事',
    inviteUrl,
  })
  assert.equal(html.includes(inviteUrl), true)
})
