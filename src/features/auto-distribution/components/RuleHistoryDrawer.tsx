'use client'

import { useEffect, useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import type { AutoDistributionLog, AutoDistributionRule } from '../types'

interface RuleHistoryDrawerProps {
  open: boolean
  onClose: () => void
  rule: AutoDistributionRule | null
  fetchLogs: (ruleId: string) => Promise<AutoDistributionLog[]>
}

const STATUS_LABELS: Record<AutoDistributionLog['status'], string> = {
  success: '成功',
  failed: '失敗',
  partial: '一部失敗',
}

const STATUS_COLORS: Record<AutoDistributionLog['status'], string> = {
  success: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-700',
  partial: 'bg-yellow-50 text-yellow-700',
}

export function RuleHistoryDrawer({ open, onClose, rule, fetchLogs }: RuleHistoryDrawerProps) {
  const [logs, setLogs] = useState<AutoDistributionLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !rule) return
    let cancelled = false
    ;(async () => {
      setIsLoading(true)
      try {
        const result = await fetchLogs(rule.id)
        if (!cancelled) setLogs(result)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, rule, fetchLogs])

  if (!open || !rule) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto border-l border-[#e2e6ec] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e6ec] bg-[#f6f8fa] sticky top-0">
          <div>
            <h3 className="text-lg font-bold text-[#24292f]">実行履歴</h3>
            <p className="text-xs text-[#57606a]">{rule.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white text-[#57606a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {isLoading && <p className="text-sm text-[#57606a]">読み込み中...</p>}
          {!isLoading && logs.length === 0 && (
            <p className="text-sm text-[#57606a]">実行履歴はまだありません。</p>
          )}
          {logs.map(log => (
            <div key={log.id} className="border border-[#e2e6ec] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedLogId(prev => (prev === log.id ? null : log.id))}
                className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-[#f6f8fa] transition-colors text-left"
              >
                <div>
                  <p className="text-xs text-[#57606a]">
                    {new Date(log.executed_at).toLocaleString('ja-JP')}
                  </p>
                  <p className="text-sm font-medium text-[#24292f]">
                    記事 {log.article_count} 件・
                    {log.triggered_by === 'manual' ? '手動実行' : '自動実行'}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[log.status]}`}
                >
                  {STATUS_LABELS[log.status]}
                </span>
              </button>

              {expandedLogId === log.id && (
                <div className="px-3 py-3 bg-[#f6f8fa] border-t border-[#e2e6ec] space-y-3">
                  {log.error_message && <p className="text-xs text-red-600">{log.error_message}</p>}
                  {log.articles.map((article, i) => (
                    <div
                      key={i}
                      className="bg-white border border-[#e2e6ec] rounded-lg p-3 space-y-1"
                    >
                      <p className="text-xs text-[#57606a]">{article.published_at}</p>
                      <p className="text-sm font-semibold text-[#24292f]">{article.title}</p>
                      <p className="text-sm text-[#24292f]">{article.summary}</p>
                      <a
                        href={article.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-[#FD7601] hover:underline"
                      >
                        ソースURL <ExternalLink className="w-3 h-3" />
                      </a>
                      <p className="text-xs text-[#57606a]">AIの意見：{article.ai_opinion}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
