import fs from 'fs'
import path from 'path'
import { slugifyHeading } from './slug'
import type { MyouManualTocItem } from './types'

const MANUAL_FILE = path.join(process.cwd(), 'docs/mYou/ユーザマニュアル.md')
const PUBLIC_IMAGE_PREFIX = '/myou/manual/screenshots/'

/** docs/mYou の Markdown を読み込み、画像パスを公開 URL に変換する */
export function getMyouUserManualMarkdown(): string {
  const raw = fs.readFileSync(MANUAL_FILE, 'utf-8')
  const withImages = raw.replace(/\]\(screenshots\//g, `](${PUBLIC_IMAGE_PREFIX}`)
  return stripEmbeddedToc(withImages)
}

/** 画面側目次と重複する Markdown 内「目次」ブロックを除去 */
function stripEmbeddedToc(markdown: string): string {
  return markdown.replace(/## 目次\r?\n[\s\S]*?\r?\n---\r?\n\r?\n/, '')
}

/** h2 / h3 見出しからサイド目次を生成 */
export function extractMyouManualToc(markdown: string): MyouManualTocItem[] {
  const items: MyouManualTocItem[] = []
  const lines = markdown.split(/\r?\n/)

  for (const line of lines) {
    const h2 = line.match(/^## (.+)$/)
    if (h2) {
      const title = h2[1].trim()
      if (title === '目次') continue
      items.push({ id: slugifyHeading(title), title, level: 2 })
      continue
    }
    const h3 = line.match(/^### (.+)$/)
    if (h3) {
      const title = h3[1].trim()
      items.push({ id: slugifyHeading(title), title, level: 3 })
    }
  }

  return items
}
