import assert from 'node:assert/strict'
import test from 'node:test'
import { ensureFriendship } from './ensureFriendship'

test('ensureFriendship: 既に友だちの場合はプロンプトしない', async () => {
  const getFriendshipCalls: unknown[] = []
  const requestFriendshipCalls: unknown[] = []
  const getFriendship = async () => {
    getFriendshipCalls.push(undefined)
    return { friendFlag: true }
  }
  const requestFriendship = async () => {
    requestFriendshipCalls.push(undefined)
  }

  await ensureFriendship({ getFriendship, requestFriendship })

  assert.equal(getFriendshipCalls.length, 1)
  assert.equal(requestFriendshipCalls.length, 0)
})

test('ensureFriendship: 未友だちの場合は friendship を促す', async () => {
  const getFriendshipCalls: unknown[] = []
  const requestFriendshipCalls: unknown[] = []
  const getFriendship = async () => {
    getFriendshipCalls.push(undefined)
    return { friendFlag: false }
  }
  const requestFriendship = async () => {
    requestFriendshipCalls.push(undefined)
  }

  await ensureFriendship({ getFriendship, requestFriendship })

  assert.equal(requestFriendshipCalls.length, 1)
})

test('ensureFriendship: エラーを飲み込み呼び出し元のフローを止めない', async () => {
  const getFriendship = async () => {
    throw new Error('not supported')
  }
  const requestFriendshipCalls: unknown[] = []
  const requestFriendship = async () => {
    requestFriendshipCalls.push(undefined)
  }

  await assert.doesNotReject(async () => ensureFriendship({ getFriendship, requestFriendship }))
  assert.equal(requestFriendshipCalls.length, 0)
})

test('ensureFriendship: requestFriendship のエラーも飲み込む', async () => {
  const getFriendship = async () => ({ friendFlag: false })
  const requestFriendship = async () => {
    throw new Error('unsupported size')
  }

  await assert.doesNotReject(async () => ensureFriendship({ getFriendship, requestFriendship }))
})
