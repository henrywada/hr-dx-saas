/** アップロード上限（Supabase Free の Storage 上限と同じ 50MB） */
export const INFO_BANK_MAX_FILE_BYTES = 50 * 1024 * 1024

/** 自動モードで RAG に切り替える有効チャンク数のしきい値 */
export const INFO_BANK_RAG_THRESHOLD_CHUNKS = 300

/** 回答生成に渡す根拠チャンクの最大数 */
export const INFO_BANK_TOP_K = 6

/** RAG ヒットとして採用する最小コサイン類似度（実資料で調整する） */
export const INFO_BANK_MIN_SIMILARITY = 0.55

/** 1 回の埋め込み呼び出しで処理するチャンク数（Vercel Hobby の実行時間対策） */
export const INFO_BANK_EMBED_BATCH = 64

/** 1 資料から取り出す本文の最大文字数（展開後に巨大化するファイル・埋め込み課金の暴走対策） */
export const INFO_BANK_MAX_TEXT_CHARS = 1_000_000

/** 1 資料あたりのチャンク数の上限 */
export const INFO_BANK_MAX_CHUNKS = 1500

/** 質問の回数制限: 1 人あたり直近 INFO_BANK_ASK_WINDOW_SECONDS 秒に何回まで */
export const INFO_BANK_ASK_LIMIT_PER_MINUTE = 5
export const INFO_BANK_ASK_WINDOW_SECONDS = 60

/** 質問から抽出するキーワードの最大数 */
export const INFO_BANK_MAX_TERMS = 8

/** 根拠が無いときの固定回答 */
export const INFO_BANK_NO_ANSWER_TEXT = '情報がありません'

/** Supabase Storage のバケット名 */
export const INFO_BANK_BUCKET = 'info_bank'

/** カテゴリの固定選択肢 */
export const INFO_BANK_CATEGORIES = ['規程', 'マニュアル', '手続き', 'FAQ', 'その他'] as const
