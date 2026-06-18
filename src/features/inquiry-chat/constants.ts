/** 埋め込みの次元数（DB の vector(n) と一致。Gemini は outputDimensionality で 1536 を指定） */
export const EMBEDDING_DIMENSION = 1536

/** gemini-embedding-001 を 1536 次元で出力（OpenAI text-embedding-3-small と同次元） */
export const EMBEDDING_MODEL = 'gemini-embedding-001'
export const CHAT_MODEL = 'gemini-2.5-flash'

export const CHUNK_MAX_CHARS = 900
export const CHUNK_OVERLAP_CHARS = 100
export const RAG_TOP_K = 8
