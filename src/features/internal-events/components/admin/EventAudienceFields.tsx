'use client'

import type { Division } from '@/features/organization/types'
import type { EventAudienceType } from '../../types'

type EventAudienceFieldsProps = {
  audienceType: EventAudienceType
  divisionId: string
  divisions: Division[]
  onAudienceTypeChange: (value: EventAudienceType) => void
  onDivisionIdChange: (value: string) => void
  idPrefix?: string
}

/** E-O1 v2: イベントの対象範囲（全社 / 部署限定） */
export function EventAudienceFields({
  audienceType,
  divisionId,
  divisions,
  onAudienceTypeChange,
  onDivisionIdChange,
  idPrefix = 'event-audience',
}: EventAudienceFieldsProps) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-xs font-semibold text-slate-700">対象範囲</p>
      <div className="flex flex-wrap gap-3 text-xs">
        <label className="inline-flex items-center gap-1.5">
          <input
            type="radio"
            name={`${idPrefix}-type`}
            checked={audienceType === 'tenant'}
            onChange={() => onAudienceTypeChange('tenant')}
          />
          全社
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input
            type="radio"
            name={`${idPrefix}-type`}
            checked={audienceType === 'division'}
            onChange={() => onAudienceTypeChange('division')}
          />
          部署限定
        </label>
      </div>
      {audienceType === 'division' ? (
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-division`} className="text-xs font-medium text-slate-600">
            対象部署
          </label>
          <select
            id={`${idPrefix}-division`}
            required
            value={divisionId}
            onChange={e => onDivisionIdChange(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
          >
            <option value="">部署を選択</option>
            {divisions.map(d => (
              <option key={d.id} value={d.id}>
                {d.name ?? '（名称未設定）'}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-500">
            選択した部署とその配下に所属する従業員にのみ表示されます。
          </p>
        </div>
      ) : (
        <p className="text-[10px] text-slate-500">テナント内の全従業員に表示されます。</p>
      )}
    </div>
  )
}
