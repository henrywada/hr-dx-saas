/** 調べる機能の3モード */
export type ResearchMode = 'tax' | 'labor' | 'law'

/** モード内のサブタブ */
export type ResearchSubTab =
  // 税法モード
  | 'tax_article'
  | 'tax_tsutatsu'
  | 'tax_saiketsu'
  // 労務法モード
  | 'labor_article'
  | 'labor_mhlw'
  | 'labor_jaish'
  // 法令モード
  | 'law_search'
  | 'law_article'
  | 'law_revision'

/**
 * 原文取得に必要なパラメータ。
 * 一覧の行から詳細取得を呼ぶときに Server Action へ渡す。
 * Server Actions の境界を越えるためプレーンオブジェクトのみで構成する。
 */
export type ResearchRef =
  | { kind: 'law_article'; lawName: string; article: string }
  | { kind: 'law_toc'; lawName: string }
  | { kind: 'mhlw_tsutatsu'; dataId: string }
  | { kind: 'jaish_tsutatsu'; url: string }
  | { kind: 'tax_tsutatsu'; tsutatsuName: string; number: string }
  | { kind: 'tax_tsutatsu_toc'; tsutatsuName: string }
  | { kind: 'saiketsu'; url: string }

/** 検索結果1件（一覧表示用） */
export type ResearchHit = {
  /** DataTable の行キー。検索結果内で一意 */
  id: string
  /** 表示タイトル */
  title: string
  /** 通達番号・法令番号など。無ければ空文字 */
  identifier: string
  /** 日付表記。原文の表記をそのまま使う。無ければ空文字 */
  dateLabel: string
  /** 要旨・抜粋。無ければ空文字 */
  summary: string
  /** 原文取得用のパラメータ */
  ref: ResearchRef
  /** 出典サイト上の原文ページURL */
  sourceUrl: string
}

/** 原文全文（詳細パネル表示用） */
export type ResearchDocument = {
  title: string
  /** 通達番号・条番号など。無ければ空文字 */
  identifier: string
  /** 本文（Markdown 相当のプレーンテキスト） */
  body: string
  /** 出典URL */
  sourceUrl: string
  /** 取得時刻（ISO8601） */
  fetchedAt: string
}

/** 失敗の分類。UI の出し分けに使う */
export type ResearchErrorKind = 'timeout' | 'upstream' | 'not_found' | 'invalid_input'

export type ResearchError = {
  kind: ResearchErrorKind
  /** ユーザーにそのまま見せる日本語メッセージ */
  message: string
  /** 出典サイトへ直接飛ばすためのURL（分かる場合） */
  sourceUrl?: string
}

/** Server Actions の戻り値。例外を投げずに必ずこの形で返す */
export type ResearchResult<T> = { ok: true; data: T } | { ok: false; error: ResearchError }

/** 検索履歴の1行 */
export type ResearchHistoryRow = {
  id: string
  mode: ResearchMode
  sub_tab: ResearchSubTab
  keyword: string
  result_count: number
  created_at: string
}
