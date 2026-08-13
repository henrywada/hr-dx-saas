'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { KYOKAI_STANDARD_ITEMS } from '@/features/health-check/kyokai-preset'
import {
  FILE_KIND_LABEL,
  type FileKind,
  type InstitutionCsvColumnMap,
} from '@/features/health-check/types'

const FILE_KIND_ORDER: FileKind[] = ['main', 'additional', 'questionnaire']

export function InstitutionCsvItemsModal({
  open,
  onOpenChange,
  institutionName,
  maps,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  institutionName: string
  maps: InstitutionCsvColumnMap[]
}) {
  const grouped = FILE_KIND_ORDER.map(kind => ({
    kind,
    headers: maps.filter(m => m.file_kind === kind).map(m => m.header_name),
  })).filter(g => g.headers.length > 0)

  const useFallback = grouped.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-[640px] flex flex-col gap-0 overflow-hidden rounded-lg p-0">
        <DialogHeader className="rounded-t-lg">
          <DialogTitle>{institutionName}のCSV項目</DialogTitle>
          <p className="sr-only">登録済みCSVの項目名一覧です。</p>
        </DialogHeader>
        <div className="overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
          {useFallback ? (
            <div>
              <p className="text-xs font-medium text-slate-700 mb-2">標準項目</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-800">
                {KYOKAI_STANDARD_ITEMS.map(s => (
                  <li key={s.code}>{s.header}</li>
                ))}
              </ul>
            </div>
          ) : (
            grouped.map(g => (
              <div key={g.kind}>
                <p className="text-xs font-medium text-slate-700 mb-2">{FILE_KIND_LABEL[g.kind]}</p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-slate-800">
                  {g.headers.map(h => (
                    <li key={`${g.kind}-${h}`}>{h}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
