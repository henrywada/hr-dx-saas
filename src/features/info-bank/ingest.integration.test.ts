/**
 * 取り込み〜改訂の統合テスト（ローカル Supabase に対して実行）。
 *
 * 実行例:
 *   INFO_BANK_TEST_SUPABASE_URL=http://127.0.0.1:55421 \
 *   INFO_BANK_TEST_SERVICE_ROLE_KEY=<supabase status の SERVICE_ROLE_KEY> \
 *   node --import tsx --test src/features/info-bank/ingest.integration.test.ts
 *
 * 環境変数が無い、または DB に接続できない場合はスキップする（CI や DB 停止中でも npm test が通る）。
 * Storage と Gemini は差し替え、作成した資料はテスト終了時に必ず削除する。
 */
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import test from 'node:test'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/types'

import { INFO_BANK_EMBED_BATCH } from './constants'
import { embedNextBatch, extractAndStoreChunks, type IngestDeps } from './ingest'

const URL_ENV = process.env.INFO_BANK_TEST_SUPABASE_URL
const KEY_ENV = process.env.INFO_BANK_TEST_SERVICE_ROLE_KEY

const UNIT_VECTOR = [1, ...Array<number>(1535).fill(0)]

/** 64 チャンクを超える長さの本文（バッチを 2 回以上に分けるため） */
function longText(label: string): string {
  return Array.from(
    { length: 4000 },
    (_, i) => `${label}${i}条 会社は従業員に誠実に対応する。`
  ).join('')
}

async function connect(): Promise<{ supabase: SupabaseClient<Database>; tenantId: string } | null> {
  if (!URL_ENV || !KEY_ENV) return null
  try {
    const supabase = createClient<Database>(URL_ENV, KEY_ENV, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await supabase.from('tenants').select('id').limit(1).maybeSingle()
    if (error || !data) return null
    return { supabase, tenantId: data.id }
  } catch {
    return null
  }
}

interface Harness {
  deps: IngestDeps
  removed: string[]
  embedCalls: { count: number; failOnCall: number | null }
}

function makeDeps(supabase: SupabaseClient<Database>, files: Map<string, string>): Harness {
  const removed: string[] = []
  const embedCalls = { count: 0, failOnCall: null as number | null }
  const deps: IngestDeps = {
    supabase,
    loadFile: async path => {
      const text = files.get(path)
      if (text === undefined) throw new Error(`ファイルが見つかりません: ${path}`)
      return Buffer.from(text, 'utf8')
    },
    removeFiles: async paths => {
      removed.push(...paths)
    },
    embed: async texts => {
      embedCalls.count += 1
      if (embedCalls.failOnCall === embedCalls.count)
        throw new Error('Gemini が一時的に失敗しました')
      return texts.map(() => UNIT_VECTOR)
    },
    extract: async buf => buf.toString('utf8'),
  }
  return { deps, removed, embedCalls }
}

async function createDocument(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  fields: Partial<Database['public']['Tables']['info_bank_documents']['Insert']>
): Promise<string> {
  const id = randomUUID()
  const { error } = await supabase.from('info_bank_documents').insert({
    id,
    tenant_id: tenantId,
    title: `統合テスト ${id.slice(0, 8)}`,
    ...fields,
  })
  assert.equal(error, null, `資料の作成に失敗: ${error?.message}`)
  return id
}

async function getDoc(supabase: SupabaseClient<Database>, id: string) {
  const { data, error } = await supabase
    .from('info_bank_documents')
    .select('*')
    .eq('id', id)
    .single()
  assert.equal(error, null)
  return data!
}

async function chunkRevisions(supabase: SupabaseClient<Database>, id: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('info_bank_chunks')
    .select('revision')
    .eq('document_id', id)
  assert.equal(error, null)
  return [...new Set((data ?? []).map(r => r.revision))].sort((a, b) => a - b)
}

/** 抽出 → 埋め込みバッチを公開まで繰り返す（画面側のループと同じ） */
async function runToCompletion(deps: IngestDeps, id: string, tenantId: string) {
  const extracted = await extractAndStoreChunks(deps, id, tenantId)
  if (!extracted.ok) return extracted
  for (let i = 0; i < 1000; i += 1) {
    const r = await embedNextBatch(deps, id, tenantId)
    if (!r.ok || r.published) return r
  }
  throw new Error('埋め込みが終わりませんでした')
}

test('新規資料を取り込むと公開され、全チャンクに埋め込みが付く', async t => {
  const conn = await connect()
  if (!conn) return t.skip('ローカル Supabase に接続できないためスキップ')
  const { supabase, tenantId } = conn
  const files = new Map([['t/new.txt', longText('新規')]])
  const { deps } = makeDeps(supabase, files)
  const id = await createDocument(supabase, tenantId, {
    revision: 0,
    pending_revision: 1,
    pending_storage_path: 't/new.txt',
    pending_filename: 'new.txt',
    pending_mime_type: 'text/plain',
  })
  try {
    const r = await runToCompletion(deps, id, tenantId)
    assert.equal(r.ok, true)

    const doc = await getDoc(supabase, id)
    assert.equal(doc.revision, 1)
    assert.equal(doc.status, 'ready')
    assert.ok(doc.published_at)
    assert.equal(doc.pending_revision, null)
    assert.equal(doc.storage_path, 't/new.txt')

    const { count } = await supabase
      .from('info_bank_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', id)
      .is('embedding', null)
    assert.equal(count, 0)
  } finally {
    await supabase.from('info_bank_documents').delete().eq('id', id)
  }
})

test('改訂版が成功すると旧版のチャンクと旧ファイルが入れ替わる', async t => {
  const conn = await connect()
  if (!conn) return t.skip('ローカル Supabase に接続できないためスキップ')
  const { supabase, tenantId } = conn
  const files = new Map([
    ['t/v1.txt', longText('旧')],
    ['t/v2.txt', longText('新')],
  ])
  const { deps, removed } = makeDeps(supabase, files)
  const id = await createDocument(supabase, tenantId, {
    revision: 0,
    pending_revision: 1,
    pending_storage_path: 't/v1.txt',
    pending_filename: 'v1.txt',
    pending_mime_type: 'text/plain',
  })
  try {
    assert.equal((await runToCompletion(deps, id, tenantId)).ok, true)

    // 改訂版を登録（registerRevisionAction 相当）
    await supabase
      .from('info_bank_documents')
      .update({
        pending_revision: 2,
        pending_storage_path: 't/v2.txt',
        pending_filename: 'v2.txt',
        pending_mime_type: 'text/plain',
        status: 'uploaded',
      })
      .eq('id', id)
    assert.equal((await runToCompletion(deps, id, tenantId)).ok, true)

    const doc = await getDoc(supabase, id)
    assert.equal(doc.revision, 2)
    assert.equal(doc.storage_path, 't/v2.txt')
    assert.deepEqual(await chunkRevisions(supabase, id), [2])
    assert.deepEqual(removed, ['t/v1.txt'])
  } finally {
    await supabase.from('info_bank_documents').delete().eq('id', id)
  }
})

test('改訂の埋め込みが途中で失敗しても旧版は公開されたまま残り、再実行で続きから完了する', async t => {
  const conn = await connect()
  if (!conn) return t.skip('ローカル Supabase に接続できないためスキップ')
  const { supabase, tenantId } = conn
  const files = new Map([
    ['t/v1.txt', longText('旧')],
    ['t/v2.txt', longText('新')],
  ])
  const { deps, removed, embedCalls } = makeDeps(supabase, files)
  const id = await createDocument(supabase, tenantId, {
    revision: 0,
    pending_revision: 1,
    pending_storage_path: 't/v1.txt',
    pending_filename: 'v1.txt',
    pending_mime_type: 'text/plain',
  })
  try {
    assert.equal((await runToCompletion(deps, id, tenantId)).ok, true)
    await supabase
      .from('info_bank_documents')
      .update({
        pending_revision: 2,
        pending_storage_path: 't/v2.txt',
        pending_filename: 'v2.txt',
        pending_mime_type: 'text/plain',
        status: 'uploaded',
      })
      .eq('id', id)

    // 改訂版の 2 回目の埋め込みバッチで失敗させる
    embedCalls.failOnCall = embedCalls.count + 2
    const failed = await runToCompletion(deps, id, tenantId)
    assert.equal(failed.ok, false)

    const mid = await getDoc(supabase, id)
    assert.equal(mid.status, 'failed')
    assert.equal(mid.revision, 1, '旧版が公開されたまま')
    assert.ok(mid.published_at)
    assert.equal(mid.storage_path, 't/v1.txt')
    assert.deepEqual(await chunkRevisions(supabase, id), [1, 2], '旧版のチャンクは消えていない')
    assert.deepEqual(removed, [], '旧ファイルはまだ削除されない')

    // 再実行: 抽出はやり直さず、未処理のチャンクから埋め込みを続ける
    const before = embedCalls.count
    let result = await embedNextBatch(deps, id, tenantId)
    while (result.ok && !result.published) result = await embedNextBatch(deps, id, tenantId)
    assert.equal(result.ok, true)
    assert.ok(embedCalls.count > before)

    const done = await getDoc(supabase, id)
    assert.equal(done.revision, 2)
    assert.equal(done.status, 'ready')
    assert.deepEqual(await chunkRevisions(supabase, id), [2])
    assert.deepEqual(removed, ['t/v1.txt'])
  } finally {
    await supabase.from('info_bank_documents').delete().eq('id', id)
  }
})

test('本文が空のファイルは失敗として記録され、公開中の版は変わらない', async t => {
  const conn = await connect()
  if (!conn) return t.skip('ローカル Supabase に接続できないためスキップ')
  const { supabase, tenantId } = conn
  const files = new Map([
    ['t/v1.txt', longText('旧')],
    ['t/empty.txt', '   \n  '],
  ])
  const { deps } = makeDeps(supabase, files)
  const id = await createDocument(supabase, tenantId, {
    revision: 0,
    pending_revision: 1,
    pending_storage_path: 't/v1.txt',
    pending_filename: 'v1.txt',
    pending_mime_type: 'text/plain',
  })
  try {
    assert.equal((await runToCompletion(deps, id, tenantId)).ok, true)
    await supabase
      .from('info_bank_documents')
      .update({
        pending_revision: 2,
        pending_storage_path: 't/empty.txt',
        pending_filename: 'empty.txt',
        pending_mime_type: 'text/plain',
        status: 'uploaded',
      })
      .eq('id', id)

    const r = await extractAndStoreChunks(deps, id, tenantId)
    assert.equal(r.ok, false)

    const doc = await getDoc(supabase, id)
    assert.equal(doc.status, 'failed')
    assert.ok(doc.error_message)
    assert.equal(doc.revision, 1)
    assert.deepEqual(await chunkRevisions(supabase, id), [1])
  } finally {
    await supabase.from('info_bank_documents').delete().eq('id', id)
  }
})

test('他テナントの資料 ID を指定しても取り込めない', async t => {
  const conn = await connect()
  if (!conn) return t.skip('ローカル Supabase に接続できないためスキップ')
  const { supabase, tenantId } = conn
  const { deps } = makeDeps(supabase, new Map([['t/x.txt', 'abc']]))
  const id = await createDocument(supabase, tenantId, {
    revision: 0,
    pending_revision: 1,
    pending_storage_path: 't/x.txt',
    pending_filename: 'x.txt',
    pending_mime_type: 'text/plain',
  })
  try {
    const r = await extractAndStoreChunks(deps, id, randomUUID())
    assert.equal(r.ok, false)
    const rb = await embedNextBatch(deps, id, randomUUID())
    assert.equal(rb.ok, false)
  } finally {
    await supabase.from('info_bank_documents').delete().eq('id', id)
  }
})

test('埋め込みバッチ件数の定数が 1 以上である', () => {
  assert.ok(INFO_BANK_EMBED_BATCH >= 1)
})
