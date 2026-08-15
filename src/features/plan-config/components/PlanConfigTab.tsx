'use client'

import { useState } from 'react'
import { updatePlanConfig } from '../actions'
import type { PlanConfigRow, PlanConfigUpdateInput } from '../types'
import type { PlanType } from '@/features/signup/types'

const INITIAL_STATUS_OPTIONS = [
  { value: 'active', label: 'active' },
  { value: 'pending', label: 'pending' },
] as const

const PAYMENT_METHOD_OPTIONS = [
  { value: 'free', label: '無料' },
  { value: 'card', label: 'カード' },
  { value: 'bank_transfer', label: '銀行振込' },
] as const

const PAYMENT_STATUS_OPTIONS = [
  { value: 'paid', label: 'paid' },
  { value: 'pending_transfer', label: 'pending_transfer' },
  { value: 'unpaid', label: 'unpaid' },
] as const

type Draft = PlanConfigUpdateInput

function toDraft(row: PlanConfigRow): Draft {
  return {
    label: row.label,
    maxEmployees: row.maxEmployees,
    initialStatus: row.initialStatus,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    contractMonths: row.contractMonths,
    available: row.available,
  }
}

interface Props {
  initialPlans: PlanConfigRow[]
}

export default function PlanConfigTab({ initialPlans }: Props) {
  const [drafts, setDrafts] = useState<Record<PlanType, Draft>>(() => {
    const next = {} as Record<PlanType, Draft>
    for (const row of initialPlans) next[row.planType] = toDraft(row)
    return next
  })
  const [saving, setSaving] = useState<PlanType | null>(null)
  const [saved, setSaved] = useState<PlanType | null>(null)

  const patch = (planType: PlanType, partial: Partial<Draft>) => {
    setDrafts(prev => ({ ...prev, [planType]: { ...prev[planType], ...partial } }))
  }

  const handleSave = async (planType: PlanType) => {
    const draft = drafts[planType]
    if (!draft) return
    setSaving(planType)
    try {
      const result = await updatePlanConfig(planType, draft)
      if (!result.success) {
        alert(result.error ?? '保存に失敗しました')
      } else {
        setSaved(planType)
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-3 w-full">
      <div>
        <h2 className="text-sm font-semibold text-[#24292f]">プラン条件</h2>
        <p className="mt-1 text-xs text-gray-500">
          サインアップ時の上限人数・契約月数・申込可否などを変更します。プランコードとテンプレートテナント名は変更できません。
        </p>
      </div>

      <div className="overflow-x-auto overflow-hidden border border-[#e2e6ec] rounded-xl">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-[#f6f8fa] border-b border-[#e2e6ec]">
              <th className="px-3 py-1 text-left text-xs font-semibold text-[#24292f]">コード</th>
              <th className="px-3 py-1 text-left text-xs font-semibold text-[#24292f]">表示名</th>
              <th className="px-3 py-1 text-left text-xs font-semibold text-[#24292f]">最大人数</th>
              <th className="px-3 py-1 text-left text-xs font-semibold text-[#24292f]">契約月数</th>
              <th className="px-3 py-1 text-center text-xs font-semibold text-[#24292f]">申込可</th>
              <th className="px-3 py-1 text-left text-xs font-semibold text-[#24292f]">初期状態</th>
              <th className="px-3 py-1 text-left text-xs font-semibold text-[#24292f]">決済</th>
              <th className="px-3 py-1 text-left text-xs font-semibold text-[#24292f]">決済状態</th>
              <th className="px-3 py-1 text-left text-xs font-semibold text-[#24292f]">
                テンプレート
              </th>
              <th className="px-3 py-1 text-center text-xs font-semibold text-[#24292f] w-24">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {initialPlans.map(row => {
              const draft = drafts[row.planType]
              if (!draft) return null
              return (
                <tr
                  key={row.planType}
                  className="bg-white hover:bg-[#f6f8fa] border-b border-[#e2e6ec] transition-colors"
                >
                  <td className="px-3 py-1 text-xs font-mono text-[#24292f]">{row.planType}</td>
                  <td className="px-3 py-1">
                    <input
                      className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs w-28"
                      value={draft.label}
                      onChange={e => patch(row.planType, { label: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-1">
                    <input
                      type="number"
                      min={1}
                      className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs w-20"
                      value={draft.maxEmployees}
                      onChange={e => patch(row.planType, { maxEmployees: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-1">
                    <input
                      type="number"
                      min={1}
                      placeholder="無期限"
                      className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs w-20"
                      value={draft.contractMonths ?? ''}
                      onChange={e =>
                        patch(row.planType, {
                          contractMonths: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={draft.available}
                      onChange={e => patch(row.planType, { available: e.target.checked })}
                    />
                  </td>
                  <td className="px-3 py-1">
                    <select
                      className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs"
                      value={draft.initialStatus}
                      onChange={e =>
                        patch(row.planType, {
                          initialStatus: e.target.value as Draft['initialStatus'],
                        })
                      }
                    >
                      {INITIAL_STATUS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-1">
                    <select
                      className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs"
                      value={draft.paymentMethod}
                      onChange={e =>
                        patch(row.planType, {
                          paymentMethod: e.target.value as Draft['paymentMethod'],
                        })
                      }
                    >
                      {PAYMENT_METHOD_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-1">
                    <select
                      className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs"
                      value={draft.paymentStatus}
                      onChange={e =>
                        patch(row.planType, {
                          paymentStatus: e.target.value as Draft['paymentStatus'],
                        })
                      }
                    >
                      {PAYMENT_STATUS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-1 text-xs text-gray-600">
                    {row.templateTenantName}
                    {row.stripePriceIdEnv ? (
                      <span className="block text-[10px] text-gray-400">
                        {row.stripePriceIdEnv}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleSave(row.planType)}
                      disabled={saving === row.planType}
                      className="bg-[#FD7601] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 disabled:opacity-50"
                    >
                      {saving === row.planType
                        ? '保存中'
                        : saved === row.planType
                          ? '保存済'
                          : '保存'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
