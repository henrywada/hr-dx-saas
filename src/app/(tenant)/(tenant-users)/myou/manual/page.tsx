import MyouUserManualViewer from '../components/MyouUserManualViewer'
import { extractMyouManualToc, getMyouUserManualMarkdown } from '@/features/myou/manual/queries'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'システム仕様書',
  description: 'セルフィール MS の製品トレーサビリティ・有効期限管理システムの操作手順書です。',
}

/** mYou システム仕様書（docs/mYou/ユーザマニュアル.md を表示） */
export default function MyouManualPage() {
  const markdown = getMyouUserManualMarkdown()
  const toc = extractMyouManualToc(markdown)

  return <MyouUserManualViewer markdown={markdown} toc={toc} />
}
