import { notFound } from 'next/navigation'
import { getConsultationStatusByToken } from '@/features/consultation/queries'
import {
  CONSULTATION_CATEGORY_LABELS,
  CONSULTATION_STATUS_LABELS,
} from '@/features/consultation/types'

export const metadata = { title: '相談ステータス確認' }

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function ConsultationStatusPublicPage({ searchParams }: Props) {
  const { token } = await searchParams
  if (!token) notFound()

  const status = await getConsultationStatusByToken(token)
  if (!status) notFound()

  const created = new Date(status.created_at).toLocaleString('ja-JP')

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-4 mt-8">
        <header>
          <h1 className="text-lg font-bold text-slate-900">相談ステータス確認</h1>
          <p className="text-xs text-slate-500 mt-1">
            匿名相談の進捗を確認できます。本文や個人情報は表示されません。
          </p>
        </header>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">受付日時</dt>
            <dd className="font-medium text-slate-900">{created}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">カテゴリ</dt>
            <dd className="font-medium text-slate-900">
              {CONSULTATION_CATEGORY_LABELS[status.category]}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">ステータス</dt>
            <dd className="font-semibold text-[#FD7601]">
              {CONSULTATION_STATUS_LABELS[status.status]}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-slate-400 leading-relaxed">
          この URL は第三者に共有しないでください。ブックマークしておくと、ログインなしで進捗を確認できます。
        </p>
      </div>
    </div>
  )
}
