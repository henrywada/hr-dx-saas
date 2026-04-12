import React from 'react'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server-user'
import { listRagDocuments } from '@/features/inquiry-chat/queries'
import { KnowledgeAdminClient } from '@/features/inquiry-chat/components/KnowledgeAdminClient'
import { APP_ROUTES } from '@/config/routes'

export default async function InquiryChatKnowledgePage() {
  const user = await getServerUser()
  const isHr = user?.appRole === 'hr' || user?.appRole === 'hr_manager'

  if (!user?.tenant_id) {
    return (
      <div className="p-8 text-center text-slate-600">
        テナント情報が取得できません。再ログインしてください。
      </div>
    )
  }

  if (!isHr) {
    return (
      <div className="p-8 max-w-lg mx-auto space-y-4 text-center">
        <p className="text-slate-700">人事ナレッジの登録は人事担当者のみ利用できます。</p>
        <Link href={APP_ROUTES.TENANT.ADMIN} className="text-blue-600 underline">
          管理トップへ
        </Link>
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
