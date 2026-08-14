'use client'

import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  createItemThreshold,
  createJudgmentCode,
  deleteItemThreshold,
  deleteJudgmentCode,
  deleteJudgmentCodeMap,
  deleteUnitConversion,
  upsertJudgmentCodeMap,
  upsertUnitConversion,
} from '@/features/health-check/actions'
import { displayItemName } from '@/features/health-check/kyokai-preset'
import type {
  HealthCheckInstitution,
  HealthCheckItem,
  HealthCheckItemThreshold,
  HealthCheckJudgmentCode,
  HealthCheckJudgmentCodeMap,
  HealthCheckUnitConversion,
} from '@/features/health-check/types'

const FIELD =
  'mt-1 block px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 disabled:opacity-60'
const TH = 'text-left py-1 px-2 font-medium'
const TD = 'py-1 px-2'

function parseOptionalNumber(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export function ConversionSettingsPanel({
  institutions,
  items,
  judgmentCodes,
  judgmentCodeMaps,
  unitConversions,
  itemThresholds,
}: {
  institutions: HealthCheckInstitution[]
  items: HealthCheckItem[]
  judgmentCodes: HealthCheckJudgmentCode[]
  judgmentCodeMaps: HealthCheckJudgmentCodeMap[]
  unitConversions: HealthCheckUnitConversion[]
  itemThresholds: HealthCheckItemThreshold[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const others = useMemo(() => institutions.filter(i => !i.is_standard), [institutions])
  const [pickedId, setPickedId] = useState('')
  const institutionId = others.some(i => i.id === pickedId) ? pickedId : (others[0]?.id ?? '')
  const selected = institutions.find(i => i.id === institutionId) ?? null
  const canConvert = Boolean(selected && !selected.is_standard)

  const mapsForInst = useMemo(
    () => judgmentCodeMaps.filter(m => m.institution_id === institutionId),
    [judgmentCodeMaps, institutionId]
  )
  const unitsForInst = useMemo(
    () => unitConversions.filter(c => c.institution_id === institutionId),
    [unitConversions, institutionId]
  )
  const thresholdsForInst = useMemo(
    () => itemThresholds.filter(t => t.institution_id === institutionId),
    [itemThresholds, institutionId]
  )

  const valueItems = useMemo(
    () => items.filter(i => i.item_kind === 'value').sort((a, b) => a.sort_order - b.sort_order),
    [items]
  )
  const itemName = useMemo(() => {
    const m = new Map<string, string>()
    for (const it of items) m.set(it.id, displayItemName(it.code, it.name))
    return m
  }, [items])
  const codeLabel = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of judgmentCodes) m.set(c.id, c.label ? `${c.code}（${c.label}）` : c.code)
    return m
  }, [judgmentCodes])

  function run(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMessage: string,
    onOk?: () => void
  ) {
    startTransition(async () => {
      const r = await fn()
      setIsError(!r.ok)
      setMessage(r.ok ? okMessage : (r.error ?? '失敗'))
      if (r.ok) onOk?.()
      router.refresh()
    })
  }

  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">他機関→標準への変換</h2>
        <p className="text-[10px] text-slate-500 mt-1">
          機関ごとに判定コード・単位・閾値の変換式を設定します。標準機関の取込では使いません。
        </p>
        {others.length > 0 ? (
          <label className="block w-full max-w-2xl text-xs mt-2">
            対象機関
            <select
              value={institutionId}
              disabled={pending}
              onChange={e => setPickedId(e.target.value)}
              className={`${FIELD} w-full`}
            >
              {others.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-xs text-slate-500 mt-2">
            他機関がありません。設定タブで標準以外の健診機関を追加してください。
          </p>
        )}
      </div>
      {message && (
        <p className={`text-xs ${isError ? 'text-red-600' : 'text-slate-600'}`}>{message}</p>
      )}

      <div className="space-y-3 pt-1">
        <h3 className="text-xs font-semibold text-slate-800">標準判定コード</h3>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={e => {
            e.preventDefault()
            const form = e.currentTarget
            const fd = new FormData(form)
            const code = String(fd.get('code') || '')
            const label = String(fd.get('label') || '')
            const severity_rank = Number(fd.get('severity_rank') || 0)
            run(
              () => createJudgmentCode({ code, label, severity_rank }),
              '標準判定コードを登録しました',
              () => form.reset()
            )
          }}
        >
          <label className="text-xs">
            コード
            <input name="code" required placeholder="A1" className={FIELD} />
          </label>
          <label className="text-xs">
            表示名
            <input name="label" placeholder="異常なし" className={FIELD} />
          </label>
          <label className="text-xs">
            並び
            <input
              name="severity_rank"
              type="number"
              defaultValue={0}
              className={`${FIELD} w-20`}
            />
          </label>
          <Button type="submit" size="sm" disabled={pending}>
            追加
          </Button>
        </form>
        {judgmentCodes.length === 0 ? (
          <p className="text-xs text-slate-500">
            まだありません。ここに追加するか、標準機関へCSV形式を適用するとプリセットが入ります。
          </p>
        ) : (
          <SimpleTable>
            <thead>
              <tr className="border-b border-slate-200">
                <th className={TH}>コード</th>
                <th className={TH}>表示名</th>
                <th className={TH}>並び</th>
                <th className={`${TH} w-10`}>
                  <span className="sr-only">削除</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {judgmentCodes.map(c => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className={TD}>{c.code}</td>
                  <td className={TD}>{c.label ?? '—'}</td>
                  <td className={TD}>{c.severity_rank}</td>
                  <td className={TD}>
                    <DeleteIconButton
                      disabled={pending}
                      label={`${c.code}を削除`}
                      onClick={() => {
                        if (
                          !confirm(
                            `標準判定コード「${c.code}」を削除しますか？対応づけも削除されます。`
                          )
                        )
                          return
                        run(() => deleteJudgmentCode(c.id), '標準判定コードを削除しました')
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </SimpleTable>
        )}
      </div>

      {!canConvert ? (
        <p className="text-xs text-slate-500 pt-3 border-t border-slate-100">
          標準機関の取込は変換しません。対象機関で他機関を選ぶと、その機関の変換式を設定できます。
        </p>
      ) : (
        <>
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-800">判定コード対応</h3>
            <p className="text-[10px] text-slate-500">
              {selected?.name}の生コードを、上の標準判定コードへ対応づけます。
            </p>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={e => {
                e.preventDefault()
                const form = e.currentTarget
                const fd = new FormData(form)
                run(
                  () =>
                    upsertJudgmentCodeMap({
                      institutionId,
                      rawCode: String(fd.get('raw_code') || ''),
                      standardJudgmentId: String(fd.get('standard_judgment_id') || ''),
                    }),
                  '判定コード対応を登録しました',
                  () => form.reset()
                )
              }}
            >
              <label className="text-xs">
                機関の判定コード
                <input name="raw_code" required placeholder="D1" className={FIELD} />
              </label>
              <label className="text-xs">
                標準判定
                <select
                  name="standard_judgment_id"
                  required
                  disabled={judgmentCodes.length === 0}
                  className={FIELD}
                >
                  {judgmentCodes.length === 0 && <option value="">先に標準判定コードを追加</option>}
                  {judgmentCodes.map(c => (
                    <option key={c.id} value={c.id}>
                      {codeLabel.get(c.id)}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="submit"
                size="sm"
                disabled={pending || !institutionId || judgmentCodes.length === 0}
              >
                追加
              </Button>
            </form>
            {mapsForInst.length > 0 && (
              <SimpleTable>
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className={TH}>機関コード</th>
                    <th className={TH}>標準判定</th>
                    <th className={`${TH} w-10`}>
                      <span className="sr-only">削除</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mapsForInst.map(m => (
                    <tr key={m.id} className="border-b border-slate-100">
                      <td className={TD}>{m.raw_code}</td>
                      <td className={TD}>{codeLabel.get(m.standard_judgment_id) ?? '—'}</td>
                      <td className={TD}>
                        <DeleteIconButton
                          disabled={pending}
                          label={`${m.raw_code}の対応を削除`}
                          onClick={() =>
                            run(() => deleteJudgmentCodeMap(m.id), '判定コード対応を削除しました')
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </SimpleTable>
            )}
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-800">単位変換</h3>
            <p className="text-[10px] text-slate-500">
              他機関の数値に倍率を掛け、標準機関の単位へ換算します。例: mg/dL → g/L、倍率 0.01。
            </p>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={e => {
                e.preventDefault()
                const form = e.currentTarget
                const fd = new FormData(form)
                const multiplier = Number(String(fd.get('multiplier') || ''))
                run(
                  () =>
                    upsertUnitConversion({
                      institutionId,
                      itemId: String(fd.get('item_id') || ''),
                      fromUnit: String(fd.get('from_unit') || ''),
                      toUnit: String(fd.get('to_unit') || ''),
                      multiplier,
                    }),
                  '単位変換を登録しました',
                  () => form.reset()
                )
              }}
            >
              <ItemSelect items={valueItems} />
              <label className="text-xs">
                変換元単位
                <input name="from_unit" required placeholder="mg/dL" className={FIELD} />
              </label>
              <label className="text-xs">
                変換先単位
                <input name="to_unit" required placeholder="g/L" className={FIELD} />
              </label>
              <label className="text-xs">
                倍率
                <input
                  name="multiplier"
                  type="number"
                  step="any"
                  required
                  defaultValue={1}
                  className={`${FIELD} w-24`}
                />
              </label>
              <Button type="submit" size="sm" disabled={pending || valueItems.length === 0}>
                追加
              </Button>
            </form>
            {unitsForInst.length > 0 && (
              <SimpleTable>
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className={TH}>項目</th>
                    <th className={TH}>変換元</th>
                    <th className={TH}>変換先</th>
                    <th className={TH}>倍率</th>
                    <th className={`${TH} w-10`}>
                      <span className="sr-only">削除</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unitsForInst.map(c => (
                    <tr key={c.id} className="border-b border-slate-100">
                      <td className={TD}>{itemName.get(c.item_id) ?? '—'}</td>
                      <td className={TD}>{c.from_unit}</td>
                      <td className={TD}>{c.to_unit}</td>
                      <td className={TD}>{c.multiplier}</td>
                      <td className={TD}>
                        <DeleteIconButton
                          disabled={pending}
                          label="単位変換を削除"
                          onClick={() =>
                            run(() => deleteUnitConversion(c.id), '単位変換を削除しました')
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </SimpleTable>
            )}
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-800">数値の再判定（閾値）</h3>
            <p className="text-[10px] text-slate-500">
              換算後の数値が範囲に入ると、その標準判定を付けます。他機関の取込でのみ使います。
            </p>
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={e => {
                e.preventDefault()
                const form = e.currentTarget
                const fd = new FormData(form)
                const sexRaw = String(fd.get('sex') || '')
                run(
                  () =>
                    createItemThreshold({
                      institutionId,
                      itemId: String(fd.get('item_id') || ''),
                      sex: sexRaw === 'male' || sexRaw === 'female' ? sexRaw : null,
                      minValue: parseOptionalNumber(fd.get('min_value')),
                      maxValue: parseOptionalNumber(fd.get('max_value')),
                      judgmentId: String(fd.get('judgment_id') || ''),
                    }),
                  '閾値を登録しました',
                  () => form.reset()
                )
              }}
            >
              <ItemSelect items={valueItems} />
              <label className="text-xs">
                性別
                <select name="sex" className={FIELD}>
                  <option value="">指定なし</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                </select>
              </label>
              <label className="text-xs">
                下限
                <input name="min_value" type="number" step="any" className={`${FIELD} w-24`} />
              </label>
              <label className="text-xs">
                上限
                <input name="max_value" type="number" step="any" className={`${FIELD} w-24`} />
              </label>
              <label className="text-xs">
                標準判定
                <select
                  name="judgment_id"
                  required
                  disabled={judgmentCodes.length === 0}
                  className={FIELD}
                >
                  {judgmentCodes.length === 0 && <option value="">先に標準判定コードを追加</option>}
                  {judgmentCodes.map(c => (
                    <option key={c.id} value={c.id}>
                      {codeLabel.get(c.id)}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="submit"
                size="sm"
                disabled={pending || valueItems.length === 0 || judgmentCodes.length === 0}
              >
                追加
              </Button>
            </form>
            {thresholdsForInst.length > 0 && (
              <SimpleTable>
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className={TH}>項目</th>
                    <th className={TH}>性別</th>
                    <th className={TH}>下限</th>
                    <th className={TH}>上限</th>
                    <th className={TH}>標準判定</th>
                    <th className={`${TH} w-10`}>
                      <span className="sr-only">削除</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {thresholdsForInst.map(t => (
                    <tr key={t.id} className="border-b border-slate-100">
                      <td className={TD}>{itemName.get(t.item_id) ?? '—'}</td>
                      <td className={TD}>
                        {t.sex === 'male' ? '男性' : t.sex === 'female' ? '女性' : '指定なし'}
                      </td>
                      <td className={TD}>{t.min_value ?? '—'}</td>
                      <td className={TD}>{t.max_value ?? '—'}</td>
                      <td className={TD}>
                        {t.judgment_id ? (codeLabel.get(t.judgment_id) ?? '—') : '—'}
                      </td>
                      <td className={TD}>
                        <DeleteIconButton
                          disabled={pending}
                          label="閾値を削除"
                          onClick={() => run(() => deleteItemThreshold(t.id), '閾値を削除しました')}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </SimpleTable>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function ItemSelect({ items }: { items: HealthCheckItem[] }) {
  return (
    <label className="text-xs">
      検査項目
      <select name="item_id" required disabled={items.length === 0} className={`${FIELD} min-w-40`}>
        {items.length === 0 && <option value="">項目がありません</option>}
        {items.map(it => (
          <option key={it.id} value={it.id}>
            {displayItemName(it.code, it.name)}
          </option>
        ))}
      </select>
    </label>
  )
}

function SimpleTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto text-xs">
      <table className="w-full border-collapse">{children}</table>
    </div>
  )
}

function DeleteIconButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title="削除"
      aria-label={label}
      disabled={disabled}
      className="inline-flex items-center justify-center rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      onClick={onClick}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}
