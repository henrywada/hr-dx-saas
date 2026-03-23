'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import type { Database } from '@/lib/supabase/types'

type OvertimeRow = Pick<
  Database['public']['Tables']['overtime_settings']['Row'],
  | 'id'
  | 'tenant_id'
  | 'monthly_limit_hours'
  | 'monthly_warning_hours'
  | 'annual_limit_hours'
  | 'average_limit_hours'
>

const DEFAULTS = {
  monthly_limit_hours: 45,
  monthly_warning_hours: 40,
  annual_limit_hours: 360,
  average_limit_hours: 80,
} as const

type Props = {
  initialRow: OvertimeRow | null
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function validatePositiveInt(raw: string, label: string): string | null {
  const s = raw.trim()
  if (s === '') {
    return `${label}を入力してください。`
  }
  const n = Number(s)
  if (!Number.isInteger(n) || n < 1) {
    return `${label}は1以上の整数で入力してください。`
  }
  return null
}

export function OvertimeSettingsForm({ initialRow }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [monthlyLimit, setMonthlyLimit] = useState(() =>
    String(initialRow?.monthly_limit_hours ?? DEFAULTS.monthly_limit_hours)
  )
  const [monthlyWarning, setMonthlyWarning] = useState(() =>
    String(initialRow?.monthly_warning_hours ?? DEFAULTS.monthly_warning_hours)
  )
  const [annualLimit, setAnnualLimit] = useState(() =>
    String(initialRow?.annual_limit_hours ?? DEFAULTS.annual_limit_hours)
  )
  const [averageLimit, setAverageLimit] = useState(() =>
    String(initialRow?.average_limit_hours ?? DEFAULTS.average_limit_hours)
  )

  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSave = async () => {
    setFlash(null)
    const nextErrors: Record<string, string> = {}
    const ml = validatePositiveInt(monthlyLimit, '月間残業上限')
    const mw = validatePositiveInt(monthlyWarning, '月間警告閾値')
    const al = validatePositiveInt(annualLimit, '年間残業上限')
    const av = validatePositiveInt(averageLimit, '2〜6ヶ月平均上限')
    if (ml) nextErrors.monthly_limit_hours = ml
    if (mw) nextErrors.monthly_warning_hours = mw
    if (al) nextErrors.annual_limit_hours = al
    if (av) nextErrors.average_limit_hours = av
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const monthly_limit_hours = Number(monthlyLimit)
    const monthly_warning_hours = Number(monthlyWarning)
    const annual_limit_hours = Number(annualLimit)
    const average_limit_hours = Number(averageLimit)

    setSaving(true)
    // 直接 upsert は INSERT 用 RLS 未適用だと失敗するため、テナント固定の RPC を使用
    const { error } = await supabase.rpc('upsert_overtime_settings', {
      p_monthly_limit_hours: monthly_limit_hours,
      p_monthly_warning_hours: monthly_warning_hours,
      p_annual_limit_hours: annual_limit_hours,
      p_average_limit_hours: average_limit_hours,
    })
    setSaving(false)

    if (error) {
      setFlash({ type: 'error', text: error.message || '保存に失敗しました。' })
      return
    }

    setFlash({ type: 'success', text: '保存しました' })
    router.refresh()
  }

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

  return (
    <div className="space-y-6">
      {flash && (
        <div
          role="status"
          className={
            flash.type === 'success'
              ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900'
              : 'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800'
          }
        >
          {flash.text}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div>
          <label htmlFor="monthly_limit_hours" className="text-sm font-medium text-slate-700">
            月間残業上限（時間）
          </label>
          <input
            id="monthly_limit_hours"
            inputMode="numeric"
            autoComplete="off"
            className={inputClass}
            value={monthlyLimit}
            onChange={(e) => setMonthlyLimit(digitsOnly(e.target.value))}
            aria-invalid={!!fieldErrors.monthly_limit_hours}
          />
          {fieldErrors.monthly_limit_hours && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.monthly_limit_hours}</p>
          )}
        </div>

        <div>
          <label htmlFor="monthly_warning_hours" className="text-sm font-medium text-slate-700">
            月間警告閾値（時間）
          </label>
          <input
            id="monthly_warning_hours"
            inputMode="numeric"
            autoComplete="off"
            className={inputClass}
            value={monthlyWarning}
            onChange={(e) => setMonthlyWarning(digitsOnly(e.target.value))}
            aria-invalid={!!fieldErrors.monthly_warning_hours}
          />
          {fieldErrors.monthly_warning_hours && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.monthly_warning_hours}</p>
          )}
        </div>

        <div>
          <label htmlFor="annual_limit_hours" className="text-sm font-medium text-slate-700">
            年間残業上限（時間）
          </label>
          <input
            id="annual_limit_hours"
            inputMode="numeric"
            autoComplete="off"
            className={inputClass}
            value={annualLimit}
            onChange={(e) => setAnnualLimit(digitsOnly(e.target.value))}
            aria-invalid={!!fieldErrors.annual_limit_hours}
          />
          {fieldErrors.annual_limit_hours && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.annual_limit_hours}</p>
          )}
        </div>

        <div>
          <label htmlFor="average_limit_hours" className="text-sm font-medium text-slate-700">
            2〜6ヶ月平均上限（時間）
          </label>
          <input
            id="average_limit_hours"
            inputMode="numeric"
            autoComplete="off"
            className={inputClass}
            value={averageLimit}
            onChange={(e) => setAverageLimit(digitsOnly(e.target.value))}
            aria-invalid={!!fieldErrors.average_limit_hours}
          />
          {fieldErrors.average_limit_hours && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.average_limit_hours}</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                保存中…
              </>
            ) : (
              '保存'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
