'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'

export type GroupAnalysisMode = 'all' | 'division' | 'establishment' | 'layer'

type Props = {
  mode: GroupAnalysisMode
  layer: number | null
  layers: number[]
}

/**
 * 集団分析の軸（部署 / 拠点 / 組織レイヤー）切替
 */
export default function GroupAnalysisToolbar({ mode, layer, layers }: Props) {
  const router = useRouter()
  const base = APP_ROUTES.TENANT.ADMIN_STRESS_CHECK_GROUP_ANALYSIS

  const linkClass = (active: boolean) =>
    `inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
      active
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
    }`

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <Link href={base} className={linkClass(mode === 'division')} prefetch={false}>
          部署別
        </Link>
        <Link
          href={`${base}?mode=establishment`}
          className={linkClass(mode === 'establishment')}
          prefetch={false}
        >
          拠点別
        </Link>
        {layers.length > 0 && (
          <span className="inline-flex items-center gap-2 flex-wrap">
            <span className={`${linkClass(mode === 'layer')} pointer-events-none opacity-90`}>
              組織レイヤー
            </span>
            <label className="sr-only" htmlFor="stress-layer-select">
              レイヤー深度
            </label>
            <select
              id="stress-layer-select"
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
              value={mode === 'layer' && layer != null ? String(layer) : String(layers[0])}
              onChange={e => {
                const v = e.target.value
                router.push(`${base}?mode=layer&layer=${encodeURIComponent(v)}`)
              }}
            >
              {layers.map(L => (
                <option key={L} value={L}>
                  レイヤー {L}
                </option>
              ))}
            </select>
          </span>
        )}
      </div>
      <p className="text-xs text-slate-500">
        {mode === 'division' && '所属部署を単位に集計します。'}
        {mode === 'establishment' && '拠点マスタに基づき事業場単位で集計します。'}
        {mode === 'layer' &&
          layer != null &&
          `階層ツリー上の深さ ${layer} のノード単位で subtree を集約します。`}
      </p>
    </div>
  )
}
