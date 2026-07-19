import { notFound } from 'next/navigation'
import { getPublicTraceInfo } from '@/features/myou/queries'

export const metadata = { title: '製品情報 | セルフィールMS' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function MyouPublicTracePage({ params }: Props) {
  const { id } = await params
  const info = await getPublicTraceInfo(id)
  if (!info) notFound()

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-lg border border-slate-200 shadow-xs p-6 space-y-4 mt-8">
        <header>
          <h1 className="text-lg font-bold text-slate-900">
            「セルフィールMS」をご利用いただき誠にありがとうございます。
          </h1>
        </header>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">ロット番号</dt>
            <dd className="font-mono font-medium text-slate-900">{info.lot_no}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">施工先No</dt>
            <dd className="font-medium text-slate-900">{info.company_no ?? '-'}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
            <dt className="text-slate-500">トレースNo</dt>
            <dd className="font-mono font-medium text-slate-900">{info.trace_no}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">有効期限</dt>
            <dd className="font-semibold text-[#FD7601]">{info.expiration_date}</dd>
          </div>
        </dl>
        <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          販売元：ミュー株式会社
        </p>
      </div>
    </div>
  )
}
