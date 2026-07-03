import Link from 'next/link'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ExecutiveAlertHighlight } from '../types'

interface AlertHighlightPanelProps {
  highlights: ExecutiveAlertHighlight[]
}

/** 離職リスク・エンゲージメントアラート・1on1未実施の3シグナルを要対応順に表示するハイライトパネル */
export function AlertHighlightPanel({ highlights }: AlertHighlightPanelProps) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-bold text-[#161b22]">要対応ハイライト</h2>
        <p className="text-xs text-[#57606a]">
          離職リスク・エンゲージメント・1on1の3シグナルを横断確認できます。カードをクリックすると詳細ダッシュボードへ移動します。
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {highlights.map(h => (
          <Link
            key={h.key}
            href={h.href}
            className={`flex items-start gap-3 rounded-lg border p-4 shadow-xs transition-colors hover:-translate-y-0.5 hover:shadow-md ${
              h.isAlert
                ? 'border-red-200 bg-red-50 hover:border-red-300'
                : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300'
            }`}
          >
            <div
              className={`shrink-0 rounded-md p-2 ${
                h.isAlert ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {h.isAlert ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium text-[#57606a]">{h.label}</p>
              <p
                className={`text-2xl font-bold ${h.isAlert ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {h.count}
                <span className="ml-1 text-xs font-medium text-[#57606a]">{h.unit}</span>
              </p>
              <p className="text-[11px] leading-relaxed text-[#57606a]">{h.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
