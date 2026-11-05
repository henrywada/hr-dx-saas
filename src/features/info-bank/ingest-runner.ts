import type { IngestProgress } from './queries'

/** 埋め込みの残件数が変わらないバッチがこの回数続いたら、進んでいないとみなして止める */
const MAX_STALLED_BATCHES = 3

type ActionResult<T extends object> = ({ ok: true } & T) | { ok: false; error: string }

/** runIngest が呼ぶ Server Action（画面側で実体を渡す。テストでは差し替える） */
export interface IngestRunnerActions {
  getProgress: (documentId: string) => Promise<IngestProgress | null>
  extract: (documentId: string) => Promise<ActionResult<{ chunkCount: number }>>
  embedBatch: (
    documentId: string
  ) => Promise<ActionResult<{ remaining: number; published: boolean }>>
}

export type IngestPhase = 'extracting' | 'embedding' | 'done'

export interface IngestProgressEvent {
  phase: IngestPhase
  remaining?: number
}

/**
 * 取り込みを公開まで進める（画面のループ）。
 * - チャンクが未作成なら抽出から、作成済みなら埋め込みの続きから再開する
 * - 1 回の Server Action を短く保つため、埋め込みはバッチごとに呼び出す
 */
export async function runIngest(
  actions: IngestRunnerActions,
  documentId: string,
  onProgress?: (event: IngestProgressEvent) => void
): Promise<{ ok: true } | { ok: false; error: string }> {
  const progress = await actions.getProgress(documentId)
  if (!progress) return { ok: false, error: '資料の状態を取得できませんでした' }

  if (progress.pendingTotal === 0) {
    onProgress?.({ phase: 'extracting' })
    const extracted = await actions.extract(documentId)
    if (extracted.ok === false) return { ok: false, error: extracted.error }
  }

  let lastRemaining = Number.POSITIVE_INFINITY
  let stalled = 0
  for (;;) {
    const batch = await actions.embedBatch(documentId)
    if (batch.ok === false) return { ok: false, error: batch.error }
    if (batch.published) {
      onProgress?.({ phase: 'done' })
      return { ok: true }
    }
    onProgress?.({ phase: 'embedding', remaining: batch.remaining })

    stalled = batch.remaining >= lastRemaining ? stalled + 1 : 0
    if (stalled >= MAX_STALLED_BATCHES) {
      return { ok: false, error: '埋め込みが進みませんでした。時間をおいて再実行してください' }
    }
    lastRemaining = batch.remaining
  }
}
