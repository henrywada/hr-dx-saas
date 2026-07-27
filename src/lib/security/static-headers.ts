/**
 * 全ルートへ適用する静的セキュリティヘッダー。
 *
 * next.config.ts から直接 import されるため、このファイルは
 * 他モジュールへ依存してはいけない（next.config.ts は単独でトランスパイルされ、
 * `@/` パスエイリアスを解決できないため）。
 * CSP はリクエストごとの nonce が必要なので src/lib/security/headers.ts 側で生成する。
 */
export const STATIC_SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  // HTTPS を 2 年強制。プリロードリストへの登録も見据える
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content-Type の推測を禁止（アップロードファイル経由の XSS 対策）
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // クリックジャッキング対策。SCORM 教材を同一オリジンの iframe で埋め込むため
  // DENY ではなく SAMEORIGIN（CSP 側の frame-ancestors 'self' と対応）
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // 外部サイトへはオリジンのみ送出（従業員 ID 等を含む URL パスを漏らさない）
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // 修了証の window.open を維持しつつクロスオリジンからの window 参照を遮断
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Permissions-Policy',
    // camera / geolocation は self を許可する必要がある：
    // - camera      … QR 打刻（html5-qrcode）、myou の QR スキャン
    // - geolocation … テレワーク勤怠の打刻位置取得（ジオフェンス）
    value: [
      'camera=(self)',
      'geolocation=(self)',
      'microphone=()',
      'payment=(self)',
      'usb=()',
      'serial=()',
      'bluetooth=()',
      'midi=()',
      'accelerometer=()',
      'gyroscope=()',
      'magnetometer=()',
      'display-capture=()',
    ].join(', '),
  },
]
