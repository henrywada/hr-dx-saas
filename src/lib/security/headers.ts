/**
 * セキュリティヘッダー定義
 *
 * - 静的ヘッダー（HSTS / X-Frame-Options 等）は next.config.ts の headers() と
 *   middleware の両方から適用する。middleware がリダイレクト・401 で短絡した応答には
 *   next.config の headers() が適用されないため、両方で set する必要がある。
 * - CSP は nonce をリクエストごとに変える必要があるため middleware でのみ生成する。
 */

import { getSupabasePublicConfig } from '@/lib/supabase/public-config'

// 静的ヘッダーの実体は next.config.ts からも読めるよう依存ゼロの別モジュールに置く
export { STATIC_SECURITY_HEADERS } from './static-headers'

// --- 外部オリジン定数 -------------------------------------------------------

/** Stripe Elements の JS 本体（loadStripe が動的に読み込む） */
const STRIPE_JS = 'https://js.stripe.com'
/** Stripe API（カードトークン化の通信先） */
const STRIPE_API = 'https://api.stripe.com'
/** Stripe 3D セキュア等のリダイレクト用 iframe */
const STRIPE_HOOKS = 'https://hooks.stripe.com'
/** Stripe が返す画像（カードブランドロゴ等） */
const STRIPE_IMG = 'https://*.stripe.com'
/** styles/hr-dx-design/tokens/fonts.css が @import している Google Fonts の CSS */
const GOOGLE_FONTS_CSS = 'https://fonts.googleapis.com'
/** 上記 CSS が参照するフォントファイル本体 */
const GOOGLE_FONTS_FILES = 'https://fonts.gstatic.com'
/** eラーニングのスライド動画（YouTube 埋め込み） */
const YOUTUBE_ORIGINS = ['https://www.youtube.com', 'https://www.youtube-nocookie.com']

// --- CSP モード -------------------------------------------------------------

export type CspMode = 'report-only' | 'enforce'

/**
 * CSP の適用モード。既定は 'enforce'（違反を実際にブロックする）。
 *
 * 本番投入後に想定外の違反が出て画面が壊れた場合の緊急退避として、
 * Vercel の環境変数に CSP_MODE=report-only を設定すると
 * 「違反を記録するだけでブロックしない」モードへ即座に戻せる（再ビルド不要）。
 */
export function getCspMode(): CspMode {
  return process.env.CSP_MODE?.trim() === 'report-only' ? 'report-only' : 'enforce'
}

/** CSP を載せる応答ヘッダー名をモードに応じて返す */
export function getCspHeaderName(mode: CspMode): string {
  return mode === 'enforce' ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'
}

// --- CSP 生成 ---------------------------------------------------------------

/** Supabase の HTTP オリジンと Realtime 用 WebSocket オリジンを返す */
function getSupabaseOrigins(): { http: string; ws: string } | null {
  const { url } = getSupabasePublicConfig()
  try {
    const { origin } = new URL(url)
    // Realtime は同一ホストへ ws:// / wss:// で接続する
    return { http: origin, ws: origin.replace(/^http/, 'ws') }
  } catch {
    return null
  }
}

/** ディレクティブ表を CSP 文字列へ整形する（値が空の配ならディレクティブ名のみ出力） */
function serializeDirectives(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([name, values]) => (values.length > 0 ? `${name} ${values.join(' ')}` : name))
    .join('; ')
}

/**
 * アプリ本体の CSP を生成する。
 *
 * script-src は 'unsafe-inline' 方式。本来は nonce + strict-dynamic が望ましいが、
 * Next.js 16 は静的シェルを持つルートの HTML を実行時にキャッシュ配信する
 * （応答が x-nextjs-cache: HIT になる）ため、リクエストごとの nonce が
 * 埋め込まれないページが残り、enforce にすると当該ページのスクリプトが
 * 全てブロックされる。force-dynamic / revalidate=0 / headers() 消費のいずれでも
 * キャッシュを無効化できなかったため、確実に enforce できる 'unsafe-inline' を採る。
 * インライン XSS は防げないが、外部オリジンからのスクリプト読み込み・object/embed・
 * base-uri 乗っ取り・フォーム送信先の書き換え・フレーミングは実際にブロックされる。
 *
 * style-src も Tailwind v4 / stitches / Radix が実行時に <style> を注入するため
 * 'unsafe-inline' が必須。
 */
export function buildAppCsp(isDev: boolean): string {
  const supabase = getSupabaseOrigins()
  const supabaseHttp = supabase ? [supabase.http] : []
  const supabaseWs = supabase ? [supabase.ws] : []

  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    // SCORM 教材を同一オリジンの iframe で埋め込むため 'none' ではなく 'self'
    'frame-ancestors': ["'self'"],
    'form-action': ["'self'"],
    'script-src': [
      "'self'",
      // Next.js が出力するブートストラップ／RSC ペイロードのインラインスクリプト用
      "'unsafe-inline'",
      // Stripe Elements（loadStripe が js.stripe.com を読み込む）
      STRIPE_JS,
      // next dev はソースマップ等で eval を使う
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'", GOOGLE_FONTS_CSS],
    'font-src': ["'self'", 'data:', GOOGLE_FONTS_FILES],
    // data: はチャート・QR、blob: は CSV/PDF 生成、Supabase は Storage の画像
    'img-src': ["'self'", 'data:', 'blob:', ...supabaseHttp, STRIPE_IMG],
    'media-src': ["'self'", 'blob:', ...supabaseHttp],
    'connect-src': [
      "'self'",
      ...supabaseHttp,
      ...supabaseWs,
      STRIPE_API,
      // dev の HMR（WebSocket）
      ...(isDev ? ['ws://localhost:*', 'ws://127.0.0.1:*'] : []),
    ],
    // blob: は修了証プレビュー、Supabase は PDF プレビュー、YouTube はスライド動画
    'frame-src': ["'self'", 'blob:', ...supabaseHttp, STRIPE_JS, STRIPE_HOOKS, ...YOUTUBE_ORIGINS],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  }

  if (!isDev) {
    directives['upgrade-insecure-requests'] = []
  }

  return serializeDirectives(directives)
}

/**
 * SCORM 教材配信ルート専用の CSP。
 *
 * /el-courses/[assignmentId]/scorm-content/** はテナント管理者がアップロードした
 * 第三者製の HTML/JS を同一オリジンで配信する（SCORM API ブリッジが window.parent を
 * 参照するため、別オリジンやサンドボックスにできない）。
 * インラインスクリプトと eval は教材が動作するために許可せざるを得ないので、
 * 代わりに外部への通信・プラグイン・base 書き換えを禁止して被害範囲を閉じ込める。
 */
export function buildScormContentCsp(): string {
  return serializeDirectives({
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'media-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    // 教材から外部サーバーへデータを送信させない
    'connect-src': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    'base-uri': ["'none'"],
    'object-src': ["'none'"],
  })
}

/** SCORM 教材配信ルートかどうかを判定する */
export function isScormContentPath(pathname: string): boolean {
  return /^\/el-courses\/[^/]+\/scorm-content(\/|$)/.test(pathname)
}
