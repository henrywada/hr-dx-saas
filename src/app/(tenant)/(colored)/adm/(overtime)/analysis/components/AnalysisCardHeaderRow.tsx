'use client'

import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

type Props = {
  title: string
  yearMonth: string
  /** 1行目の下に右揃えで表示する補足（例: 計算式） */
  sublineRight?: string
  /** false のとき中央の「yyyy年M月」を出さない（過去12ヶ月トレンドなど） */
  showYearMonth?: boolean
}

/** 勤務状況分析カードの見出し行（左:タイトル、中央:年月、任意:2行目右揃え） */
export function AnalysisCardHeaderRow({
  title,
  yearMonth,
  sublineRight,
  showYearMonth = true,
}: Props) {
  const ymLabel = format(parseISO(yearMonth), 'yyyy年M月', { locale: ja })

  if (!showYearMonth) {
    return (
      <div className="mb-4 grid w-full gap-y-1">
        <h3 className="text-left text-base font-bold leading-snug text-gray-900 sm:text-lg">{title}</h3>
        {sublineRight ? (
          <p className="text-right text-xs text-slate-600 sm:text-sm">{sublineRight}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="mb-4 grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-1">
      <h3 className="justify-self-start text-left text-base font-bold leading-snug text-gray-900 sm:text-lg">
        {title}
      </h3>
      <span className="justify-self-center whitespace-nowrap text-sm font-semibold tabular-nums text-slate-800 sm:text-base">
        {ymLabel}
      </span>
      <div className="min-w-0" aria-hidden />
      {sublineRight ? (
        <p className="col-span-3 text-right text-xs text-slate-600 sm:text-sm">{sublineRight}</p>
      ) : null}
    </div>
  )
}
