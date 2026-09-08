'use client'

import dynamic from 'next/dynamic'
import type { OrgTree } from '../org-tree'

interface OrgTreeSectionProps {
  data: OrgTree
}

const OrgTreeCanvas = dynamic(() => import('./OrgTreeCanvas').then(mod => mod.OrgTreeCanvas), {
  ssr: false,
  loading: () => <p className="text-xs text-slate-400">組織ツリーを読み込み中...</p>,
})

/**
 * 目標詳細ページの組織ツリーセクション。
 * `@xyflow/react`は本機能専用の重量級ライブラリのため、`next/dynamic`（`ssr: false`）で
 * このセクションが実際に描画される時のみクライアント側で読み込み、
 * 目標詳細ページの初期表示バンドルには含めない。
 */
export function OrgTreeSection({ data }: OrgTreeSectionProps) {
  if (data.nodes.length <= 1) {
    return <p className="text-xs text-slate-400">タスクグループがまだありません。</p>
  }

  return <OrgTreeCanvas nodes={data.nodes} edges={data.edges} />
}
