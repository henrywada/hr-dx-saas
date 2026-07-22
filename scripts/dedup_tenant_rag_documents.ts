/**
 * tenant_rag_documents の既存重複を掃除し、content_hash をバックフィルする。
 *
 * 背景:
 *   tenant_rag には従来 dedup が無く、同じ資料の再アップロード/再貼り付けで
 *   完全な二重登録が発生していた。取り込みアクション側に置換ロジックを入れたが、
 *   それ以前に作られた重複行は残るため、本スクリプトで一括掃除する。
 *
 * 重複の定義（取り込み側の置換ロジックと同一）:
 *   同一テナントの status='ready' 文書のうち、
 *     - content_hash が一致（保存済みチャンクの結合ハッシュ）、または
 *     - ソース識別子が一致（url→source_url / file→original_filename /
 *       paste→title（既定タイトル '貼り付けテキスト' は除外））
 *   これらで連結されるクラスタを「同一文書」とみなし、
 *   created_at が最新の1件を残して残りを削除する（チャンクは CASCADE）。
 *
 * 安全性:
 *   - デフォルトは dry-run（書き込みなし、件数レポートのみ）。
 *     実際に削除・バックフィルするには `--apply` を明示的に付ける。
 *   - 削除対象は各クラスタ内の「最新以外」のみ。各クラスタに必ず1件は残る。
 *   - file 文書は Storage オブジェクトも合わせて削除する。
 *
 * 使い方:
 *   DATABASE_URL=... NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     npx tsx scripts/dedup_tenant_rag_documents.ts             # dry-run（件数レポート）
 *   同上 + --apply                                              # 実削除・バックフィル
 */
import 'dotenv/config'
import postgres from 'postgres'
import { createClient } from '@supabase/supabase-js'
import { computeContentHash, DEFAULT_PASTE_TITLE } from '../src/features/inquiry-chat/dedup'

const apply = process.argv.includes('--apply')

/** 接続文字列から認証情報を除いたホスト名を取り出す（実行対象の目視確認用） */
function describeDbTarget(databaseUrl: string): string {
  try {
    const u = new URL(databaseUrl)
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`
  } catch {
    return '(解析不能な接続文字列)'
  }
}

/**
 * Supabase の Transaction pooler（ポート 6543）は PgBouncer 経由のため
 * prepared statement が使えない。ポートを見て自動的に無効化する。
 */
function postgresOptions(databaseUrl: string): {
  max: number
  prepare?: boolean
  password?: string
} {
  const options: { max: number; prepare?: boolean; password?: string } = { max: 1 }
  try {
    if (new URL(databaseUrl).port === '6543') options.prepare = false
  } catch {
    // 解析できない場合は既定値
  }
  const rawPassword = process.env.SUPABASE_DB_PASSWORD
  if (rawPassword) options.password = rawPassword
  return options
}

type DocRow = {
  id: string
  tenant_id: string
  title: string
  source_kind: string
  source_url: string | null
  original_filename: string | null
  content_hash: string | null
  storage_path: string | null
  created_at: string
}

/** Union-Find（クラスタリング用） */
class DSU {
  private parent = new Map<string, string>()
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x)
    let root = x
    while (this.parent.get(root) !== root) root = this.parent.get(root)!
    // 経路圧縮
    let cur = x
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!
      this.parent.set(cur, root)
      cur = next
    }
    return root
  }
  union(a: string, b: string): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

/** doc から連結キー（このキーを共有する doc 同士は同一クラスタ）を列挙する */
function linkKeys(doc: DocRow, contentHash: string): string[] {
  const keys: string[] = [`h:${contentHash}`]
  if (doc.source_kind === 'url' && doc.source_url) keys.push(`u:${doc.source_url}`)
  else if (doc.source_kind === 'file' && doc.original_filename)
    keys.push(`f:${doc.original_filename}`)
  else if (doc.source_kind === 'paste') {
    const t = doc.title?.trim()
    if (t && t !== DEFAULT_PASTE_TITLE) keys.push(`p:${t}`)
  }
  return keys
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL が未設定です')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です')
  }

  console.log('==================================================')
  console.log(`接続先DB      : ${describeDbTarget(databaseUrl)}`)
  console.log(`接続先Storage : ${supabaseUrl}`)
  console.log(
    `モード        : ${apply ? '★ --apply（実削除・バックフィル）' : 'dry-run（書き込みなし）'}`
  )
  console.log('==================================================')

  const sql = postgres(databaseUrl, postgresOptions(databaseUrl))
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const docs = await sql<DocRow[]>`
    SELECT id, tenant_id, title, source_kind, source_url, original_filename,
           content_hash, storage_path, created_at
    FROM public.tenant_rag_documents
    WHERE status = 'ready'
    ORDER BY tenant_id, created_at ASC
  `
  console.log(`ready 文書: ${docs.length} 件`)

  // 1) 各文書の content_hash を保存済みチャンクから算出（バックフィル値）
  const hashByDoc = new Map<string, string>()
  for (const doc of docs) {
    const chunks = await sql<{ content: string }[]>`
      SELECT content FROM public.tenant_rag_chunks
      WHERE document_id = ${doc.id}::uuid
      ORDER BY chunk_index ASC
    `
    hashByDoc.set(doc.id, computeContentHash(chunks.map(c => c.content)))
  }

  // 2) テナントごとにクラスタリングし、最新以外を削除候補にする
  const docsByTenant = new Map<string, DocRow[]>()
  for (const doc of docs) {
    const arr = docsByTenant.get(doc.tenant_id) ?? []
    arr.push(doc)
    docsByTenant.set(doc.tenant_id, arr)
  }

  const toDelete: DocRow[] = []
  let duplicateGroups = 0

  for (const [tenantId, tenantDocs] of docsByTenant) {
    const dsu = new DSU()
    const keyToDoc = new Map<string, string>()
    for (const doc of tenantDocs) {
      for (const key of linkKeys(doc, hashByDoc.get(doc.id)!)) {
        const prev = keyToDoc.get(key)
        if (prev) dsu.union(prev, doc.id)
        else keyToDoc.set(key, doc.id)
      }
    }

    // クラスタごとに最新（created_at 最大）を残す
    const clusters = new Map<string, DocRow[]>()
    for (const doc of tenantDocs) {
      const root = dsu.find(doc.id)
      const arr = clusters.get(root) ?? []
      arr.push(doc)
      clusters.set(root, arr)
    }

    for (const [, group] of clusters) {
      if (group.length <= 1) continue
      duplicateGroups++
      // postgres.js は timestamptz を Date で返すため、数値化して比較する（新しい順）
      const ts = (v: DocRow['created_at']) => new Date(v as unknown as string | Date).getTime()
      const sorted = [...group].sort((a, b) => ts(b.created_at) - ts(a.created_at))
      const keep = sorted[0]!
      const remove = sorted.slice(1)
      toDelete.push(...remove)
      console.log(
        `  [tenant=${tenantId}] ${group.length}件のクラスタ → 1件保持 / ${remove.length}件削除` +
          `\n      保持: ${keep.title} (${keep.id}, ${keep.created_at})` +
          remove.map(r => `\n      削除: ${r.title} (${r.id}, ${r.created_at})`).join('')
      )
    }
  }

  console.log('---')
  console.log(`重複クラスタ: ${duplicateGroups} 組 / 削除対象文書: ${toDelete.length} 件`)

  if (!apply) {
    console.log('dry-run 完了（--apply で content_hash バックフィル + 実削除）')
    await sql.end()
    return
  }

  // 3) content_hash を全 ready 文書にバックフィル
  for (const doc of docs) {
    await sql`
      UPDATE public.tenant_rag_documents
      SET content_hash = ${hashByDoc.get(doc.id)!}
      WHERE id = ${doc.id}::uuid
    `
  }
  console.log(`content_hash バックフィル: ${docs.length} 件`)

  // 4) 重複文書を削除（Storage オブジェクト削除 → DB 行削除でチャンクは CASCADE）
  const storagePaths = toDelete
    .map(d => d.storage_path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
  if (storagePaths.length > 0) {
    const { error: rmErr } = await supabase.storage.from('tenant_rag').remove(storagePaths)
    if (rmErr) console.error('Storage 削除でエラー:', rmErr.message)
  }
  for (const doc of toDelete) {
    await sql`DELETE FROM public.tenant_rag_documents WHERE id = ${doc.id}::uuid`
  }
  console.log(`削除完了: ${toDelete.length} 件（チャンクは CASCADE で削除）`)

  await sql.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
