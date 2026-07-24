import type { Metadata } from 'next'
import DocIndexClient from '../components/DocIndexClient'

export const metadata: Metadata = {
  title: '資料一覧',
  description: '製品トレーサビリティ関連のマニュアル・資料の目次です。',
}

/** mYou 資料一覧（本の目次風） */
export default function MyouDocIndexPage() {
  return <DocIndexClient />
}
