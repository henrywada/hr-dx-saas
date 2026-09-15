import assert from 'node:assert/strict'
import test from 'node:test'
import { parseFriendLinkAcceptBody, parseLiffAuthBody } from './parseLiffBodies'

test('parseFriendLinkAcceptBody: 有効な body をパースする', () => {
  const result = parseFriendLinkAcceptBody({ idToken: 'abc.def.ghi', inviteToken: 'tok123' })
  assert.deepEqual(result, { idToken: 'abc.def.ghi', inviteToken: 'tok123' })
})

test('parseFriendLinkAcceptBody: idToken 欠落を拒否する', () => {
  assert.throws(() => parseFriendLinkAcceptBody({ inviteToken: 'tok123' }))
})

test('parseFriendLinkAcceptBody: 空の inviteToken を拒否する', () => {
  assert.throws(() => parseFriendLinkAcceptBody({ idToken: 'abc.def.ghi', inviteToken: '' }))
})

test('parseFriendLinkAcceptBody: 非オブジェクト body を拒否する', () => {
  assert.throws(() => parseFriendLinkAcceptBody('not an object'))
})

test('parseLiffAuthBody: 有効な body をパースする', () => {
  assert.deepEqual(parseLiffAuthBody({ idToken: 'abc.def.ghi' }), { idToken: 'abc.def.ghi' })
})

test('parseLiffAuthBody: idToken 欠落を拒否する', () => {
  assert.throws(() => parseLiffAuthBody({}))
})

test('parseLiffAuthBody: 非文字列 idToken を拒否する', () => {
  assert.throws(() => parseLiffAuthBody({ idToken: 123 }))
})

test('parseLiffAuthBody: 非オブジェクト body を拒否する', () => {
  assert.throws(() => parseLiffAuthBody(null))
})
