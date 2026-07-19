import { notFound } from 'next/navigation'
import {
  CalendarClock,
  Fingerprint,
  MapPin,
  Package,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-slate-50 to-slate-100 flex items-start justify-center p-4 sm:p-6">
      <div className="w-full max-w-md mt-8 rounded-2xl overflow-hidden bg-white shadow-xl shadow-emerald-900/10 ring-1 ring-emerald-900/5">
        {/* ヘッダー：ブランドグリーンのグラデーション＋淡い光彩で奥行きを演出 */}
        <header className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 px-6 py-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
              <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-base font-bold leading-snug text-white">
              「セルフィールMS」をご利用いただき誠にありがとうございます。
            </h1>
          </div>
        </header>

        {/* 製品トレーサビリティ情報 */}
        <dl className="px-6 py-2">
          <TraceRow icon={Package} label="ロット番号" value={info.lot_no} mono />
          <TraceRow icon={MapPin} label="施工先No" value={info.company_no ?? '-'} />
          <TraceRow icon={Fingerprint} label="トレースNo" value={info.trace_no} mono />
          <TraceRow
            icon={CalendarClock}
            label="有効期限"
            value={info.expiration_date}
            accent
            last
          />
        </dl>

        {/* 販売元 */}
        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <p className="text-xs text-slate-500">販売元：ミュー株式会社</p>
          <a
            href="https://myou-co.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-emerald-700 underline-offset-2 hover:text-emerald-800 hover:underline"
          >
            https://myou-co.net/
          </a>
        </footer>
      </div>
    </div>
  )
}

interface TraceRowProps {
  icon: LucideIcon
  label: string
  value: string | number
  mono?: boolean
  accent?: boolean
  last?: boolean
}

function TraceRow({ icon: Icon, label, value, mono, accent, last }: TraceRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 py-3 ${!last ? 'border-b border-slate-100' : ''}`}
    >
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4 text-emerald-600" />
        <dt className="text-sm">{label}</dt>
      </div>
      <dd
        className={[
          'text-sm font-semibold',
          mono ? 'font-mono' : '',
          accent ? 'text-base text-emerald-700' : 'text-slate-900',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  )
}
