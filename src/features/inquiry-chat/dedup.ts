import { createHash } from 'node:crypto'

/**
 * tenant_rag（人事へのお問合せRAG）の重複取り込み判定ロジック。
 *
 * 取り込みアクションは従来、再アップロード/再貼り付けのたびに新しい文書＋チャンクを
 * 無条件に作成しており、同一資料が完全に二重登録され検索に両方ヒットしていた。
 * ここでは「同一文書」を検出して旧版を置換するための純関数を定義する。
 * DB ユニーク制約は張らず（失敗/再試行行や並行取り込みをブロックしないため）、
 * アプリ層でこの判定を行う。
 */

/** 貼り付け取り込みの既定タイトル。既定のままでは title を置換キーに使わない（誤置換防止）。 */
export const DEFAULT_PASTE_TITLE = '貼り付けテキスト'

/**
 * 保存済みチャンク列からコンテンツハッシュを算出する。
 *
 * 取り込み時の元テキスト（plainText）は永続化されておらず、特に paste は再構築できない。
 * そのため「保存済みチャンクの結合」をハッシュ定義とすることで、新規取り込み時と
 * 既存データのバックフィル時（tenant_rag_chunks から復元）で同一定義を保てる。
 */
export function computeContentHash(chunks: string[]): string {
  return createHash('sha256').update(chunks.join('\n')).digest('hex')
}

/** 重複判定対象の既存文書（tenant_rag_documents の必要列のみ） */
export interface DedupCandidate {
  id: string
  status: string
  content_hash: string | null
  source_kind: string
  source_url: string | null
  original_filename: string | null
  title: string
}

/** 新規取り込み文書の置換キー */
export interface DedupKey {
  /** 新規文書自身の id（自己一致を除外するため） */
  selfId: string
  contentHash: string
  sourceKind: string
  sourceUrl?: string | null
  originalFilename?: string | null
  title: string
}

/** ソース識別子が一致するか（同一 source_kind 内でのみ判定） */
function sourceIdentifierMatches(candidate: DedupCandidate, key: DedupKey): boolean {
  if (candidate.source_kind !== key.sourceKind) return false

  switch (key.sourceKind) {
    case 'url':
      return !!key.sourceUrl && candidate.source_url === key.sourceUrl
    case 'file':
      return !!key.originalFilename && candidate.original_filename === key.originalFilename
    case 'paste': {
      // 既定タイトルは多くの貼り付けで共有されうるため置換キーにしない
      const title = key.title?.trim()
      if (!title || title === DEFAULT_PASTE_TITLE) return false
      return candidate.title === key.title
    }
    default:
      return false
  }
}

/**
 * 置換すべき既存文書の id 一覧を返す。
 * 条件: status='ready' かつ 自分以外で、content_hash 完全一致 または ソース識別子一致。
 */
export function selectDuplicateDocIds(candidates: DedupCandidate[], key: DedupKey): string[] {
  return candidates
    .filter(c => c.status === 'ready' && c.id !== key.selfId)
    .filter(
      c => (c.content_hash && c.content_hash === key.contentHash) || sourceIdentifierMatches(c, key)
    )
    .map(c => c.id)
}
