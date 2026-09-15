import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  TMP_MAX_AGE_MS,
  cleanupTmp,
  filesToDelete,
} from '@/lib/documents/cleanupTmp'

test('filesToDelete exports 24h as the default max age', () => {
  assert.equal(TMP_MAX_AGE_MS, 24 * 60 * 60 * 1000)
})

test('filesToDelete includes files older than maxAgeMs', () => {
  const now = new Date('2026-08-28T12:00:00Z')
  const entries = [
    {
      name: 'old.jpg',
      created_at: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
    },
  ]

  assert.deepEqual(filesToDelete(entries, now, TMP_MAX_AGE_MS), ['old.jpg'])
})

test('filesToDelete excludes files newer than maxAgeMs', () => {
  const now = new Date('2026-08-28T12:00:00Z')
  const entries = [
    {
      name: 'recent.jpg',
      created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    },
  ]

  assert.deepEqual(filesToDelete(entries, now, TMP_MAX_AGE_MS), [])
})

test('filesToDelete excludes files with missing created_at', () => {
  const now = new Date('2026-08-28T12:00:00Z')
  const entries = [{ name: 'unknown.jpg' }, { name: 'null.jpg', created_at: null }]

  assert.deepEqual(filesToDelete(entries, now, TMP_MAX_AGE_MS), [])
})

function makeSupabase(options: {
  listData?: Array<{ name: string; created_at?: string | null }>
  listError?: { message: string } | null
  removeError?: { message: string } | null
}) {
  const removeCalls: string[][] = []
  const listCalls: Array<[string, { limit: number }]> = []
  const fromCalls: string[] = []

  const remove = async (paths: string[]) => {
    removeCalls.push(paths)
    return { data: [], error: options.removeError ?? null }
  }
  const list = async (folder: string, opts: { limit: number }) => {
    listCalls.push([folder, opts])
    return {
      data: options.listData ?? [],
      error: options.listError ?? null,
    }
  }

  const from = (bucket: string) => {
    fromCalls.push(bucket)
    return { list, remove }
  }

  return {
    supabase: { storage: { from } } as unknown as SupabaseClient,
    listCalls,
    removeCalls,
    fromCalls,
  }
}

test('cleanupTmp lists tenant/user tmp folder and deletes stale files', async () => {
  const tenantId = '11111111-1111-4111-8111-111111111111'
  const userId = '22222222-2222-4222-8222-222222222222'
  const now = new Date('2026-08-28T12:00:00Z')

  const { supabase, listCalls, removeCalls, fromCalls } = makeSupabase({
    listData: [
      {
        name: 'old.jpg',
        created_at: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
      },
      {
        name: 'recent.jpg',
        created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      },
    ],
  })

  await cleanupTmp(supabase, tenantId, userId, now)

  assert.ok(fromCalls.every((b) => b === 'captured-documents'))
  assert.deepEqual(listCalls, [[`${tenantId}/tmp/${userId}`, { limit: 1000 }]])
  assert.deepEqual(removeCalls, [[`${tenantId}/tmp/${userId}/old.jpg`]])
})

test('cleanupTmp ignores list failures', async () => {
  const tenantId = '11111111-1111-4111-8111-111111111111'
  const userId = '22222222-2222-4222-8222-222222222222'
  const now = new Date('2026-08-28T12:00:00Z')

  const { supabase, removeCalls } = makeSupabase({
    listError: { message: 'list failed' },
  })

  await assert.doesNotReject(cleanupTmp(supabase, tenantId, userId, now))
  assert.equal(removeCalls.length, 0)
})

test('cleanupTmp ignores remove failures', async () => {
  const tenantId = '11111111-1111-4111-8111-111111111111'
  const userId = '22222222-2222-4222-8222-222222222222'
  const now = new Date('2026-08-28T12:00:00Z')

  const { supabase, removeCalls } = makeSupabase({
    listData: [
      {
        name: 'old.jpg',
        created_at: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
      },
    ],
    removeError: { message: 'remove failed' },
  })

  await assert.doesNotReject(cleanupTmp(supabase, tenantId, userId, now))
  assert.equal(removeCalls.length, 1)
})
