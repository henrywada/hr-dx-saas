/** e-Gov 法令API v2 のレスポンス型（法令本文取得API・elm絞り込み利用時） */

export type EgovNode = {
  tag: string
  attr?: Record<string, string>
  children?: (EgovNode | string)[]
}

export type EgovLawData = {
  revision_info?: {
    law_title?: string
  }
  current_revision_info?: {
    law_title?: string
  }
  law_full_text: EgovNode
}
