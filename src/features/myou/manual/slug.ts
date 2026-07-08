import type { ReactNode } from 'react'

/**
 * マニュアル見出しのアンカー ID 生成（Markdown 内リンクと揃える）
 */
export function slugifyHeading(title: string): string {
  let slug = title.trim()
  // 括弧内の補足はアンカーから除外（GitHub 風）
  slug = slug.replace(/[（(][^）)]*[）)]/g, '')
  slug = slug.replace(/[—–:/]/g, '-')
  slug = slug.replace(/\./g, '')
  slug = slug.replace(/\s+/g, '-')
  slug = slug.replace(/-+/g, '-')
  slug = slug.replace(/^-|-$/g, '')
  return slug
}

/** 見出しテキストから React 子要素のプレーンテキストを抽出 */
export function extractPlainText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node)
  }
  if (Array.isArray(node)) {
    return node.map(extractPlainText).join('')
  }
  if (node && typeof node === 'object' && 'props' in node) {
    const element = node as { props?: { children?: ReactNode } }
    return extractPlainText(element.props?.children ?? '')
  }
  return ''
}
