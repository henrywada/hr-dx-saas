import React from 'react'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server-user'
import { listRagDocuments } from '@/features/inquiry-chat/queries'
import { KnowledgeAdminClient } from '@/features/inquiry-chat/components/KnowledgeAdminClient'
import { APP_ROUTES } from '@/config/routes'

/**
 * RAG 取り込み（PDF 解析・Storage・埋め込み・チャンク保存）が長時間かかる。
 * クラウドの Serverless 既定タイムアウトを超えると応答が返らず UI が「取り込み中」のままに見える。
 * Vercel Pro 等で最大 300 秒まで延長可能（プランにより上限あり）。
 */
export const maxDuration = 300

export default async function InquiryChatKnowledgePage() {
  const user = await getServerUser()

  if (!user?.tenant_id) {
    return (
      <div className="p-8 text-center text-slate-600">
        テナント情報が取得できません。再ログインしてください。
      </div>
    )
  }

  const docs = await listRagDocuments()

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">人事ナレッジ（RAG）登録</h1>
          <p className="text-sm text-slate-500 mt-1">
            取り込んだ文書は、ポータル上部の「人事へのお問合せ」モーダル内 AI
            チャットの参照元になります。
          </p>
        </div>
        <Link
          href={APP_ROUTES.TENANT.PORTAL}
          className="text-sm font-medium text-blue-600 hover:underline shrink-0"
        >
          ポータルへ
        </Link>
      </div>
      <KnowledgeAdminClient initialDocuments={docs} />
    </div>
  )
}
