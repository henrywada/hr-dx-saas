-- =============================================================================
-- tenant_rag（人事へのお問合せRAG）の重複取り込み防止
--
-- 背景:
--   tenant_rag_documents / tenant_rag_chunks には重複防止機構が無く、
--   同じ資料を再アップロード/再貼り付けするたびに新しい document_id で
--   文書＋チャンクがまるごと作成され、完全に二重登録されていた。
--   両方が status='ready' のままベクトル検索（match_tenant_rag_chunks）に
--   ヒットし、同一内容が重複してチャット回答のコンテキストに注入される。
--
-- 方針:
--   「保存済みチャンクの結合」から算出する content_hash を文書に持たせ、
--   取り込みアクション側（アプリ層）で content_hash / ソース識別子の一致を
--   検出して旧版を置換する。
--   UNIQUE 制約は張らない。失敗・再試行中（status<>'ready'）の行や、
--   並行取り込みの一時的な重複をブロックしてしまうため、可視化・検索用の
--   通常インデックスのみを張る。
-- =============================================================================

ALTER TABLE public.tenant_rag_documents
  ADD COLUMN IF NOT EXISTS content_hash text;

COMMENT ON COLUMN public.tenant_rag_documents.content_hash IS
  '保存済みチャンクの結合から算出する sha256。アプリ層の重複判定（旧版置換）に使用';

-- テナント内の content_hash 検索を高速化（アプリ層 dedup の事前チェック用）。
-- UNIQUE ではないのは失敗/再試行行・並行取り込みをブロックしないため。
CREATE INDEX IF NOT EXISTS tenant_rag_documents_tenant_hash_idx
  ON public.tenant_rag_documents (tenant_id, content_hash);
