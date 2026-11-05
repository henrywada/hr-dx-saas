import { INFO_BANK_MAX_FILE_BYTES } from './constants'

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv',
  txt: 'text/plain',
}

/** Google の「ドキュメントへのリンク」だけが入ったポインタファイル */
const GOOGLE_POINTER_EXTS = new Set(['gdoc', 'gsheet', 'gslides'])

/** 旧 Office 形式（本文抽出に非対応）→ 変換先の案内 */
const LEGACY_EXT_HINT: Record<string, string> = {
  doc: 'docx',
  ppt: 'pptx',
}

export type UploadValidation = { ok: true; mime: string } | { ok: false; error: string }

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.')
  if (i <= 0 || i === name.length - 1) return ''
  return name
    .slice(i + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** アップロード前（ブラウザ・サーバー共通）にファイルの可否を判定する */
export function validateUpload(input: {
  name: string
  size: number
  mime: string
}): UploadValidation {
  if (input.size <= 0) return { ok: false, error: '空のファイルは登録できません' }
  if (input.size > INFO_BANK_MAX_FILE_BYTES) {
    return { ok: false, error: '50MB 以下のファイルにしてください' }
  }

  const ext = extensionOf(input.name)

  if (GOOGLE_POINTER_EXTS.has(ext)) {
    return {
      ok: false,
      error:
        'Google のファイルは中身ではなくリンクだけが保存されています。Google ドライブで「ファイル → ダウンロード → Microsoft Word / Excel」を選んで書き出したファイルを登録してください',
    }
  }

  const legacy = LEGACY_EXT_HINT[ext]
  if (legacy) {
    return {
      ok: false,
      error: `.${ext} は取り込めません。.${legacy} 形式に保存し直してから登録してください`,
    }
  }

  const mime = MIME_BY_EXT[ext]
  if (!mime) {
    return {
      ok: false,
      error: '対応形式は PDF / Word(docx) / Excel(xlsx, xls) / CSV / テキストです',
    }
  }
  return { ok: true, mime }
}
