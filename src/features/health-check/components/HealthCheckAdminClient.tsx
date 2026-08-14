'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { APP_ROUTES } from '@/config/routes'
import {
  applyPresetToInstitution,
  commitCsvImport,
  createCampaign,
  createInstitution,
  deleteCampaign,
  deleteInstitution,
  previewCsvImport,
  saveManualResult,
  setStandardInstitution,
  updateCampaign,
} from '@/features/health-check/actions'
import {
  decodeHealthCheckCsvBytes,
  mergeCsvPersons,
  parseCsvHeaders,
  parseHealthCheckCsvText,
} from '@/features/health-check/csv-parse'
import { displayItemName, resolveManualFormItems } from '@/features/health-check/kyokai-preset'
import { ManualItemSettingsModal } from '@/features/health-check/components/ManualItemSettingsModal'
import { InstitutionCsvItemsModal } from '@/features/health-check/components/InstitutionCsvItemsModal'
import {
  EMPLOYMENT_JUDGMENT_LABEL,
  type CsvFormatPreset,
  type FileKind,
  type HealthCheckCampaign,
  type HealthCheckInstitution,
  type HealthCheckItem,
  type HrRecordRow,
  type InstitutionCsvColumnMap,
  type KyokaiPresetSpec,
  type OrgAnalysisRow,
  type OrgLayer,
  type ParticipationStats,
} from '@/features/health-check/types'

type NotReceived = {
  id: string
  name: string
  employee_no: string | null
  division_name: string | null
}

type AdminView = 'import' | 'manual' | 'analysis' | 'settings'

export function HealthCheckAdminClient(props: {
  view: AdminView
  campaigns: HealthCheckCampaign[]
  selectedCampaign: HealthCheckCampaign | null
  institutions: HealthCheckInstitution[]
  presets: CsvFormatPreset[]
  items: HealthCheckItem[]
  stats: ParticipationStats | null
  records: HrRecordRow[]
  notReceived: NotReceived[]
  orgRows: OrgAnalysisRow[]
  orgLayer: OrgLayer
  orgCampaignId?: string | null
  maxOrgLayer?: number
  employees: { id: string; name: string; employee_no: string | null }[]
  manualItemIds: string[]
  columnMaps?: InstitutionCsvColumnMap[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [itemSettingsOpen, setItemSettingsOpen] = useState(false)
  const [analysisDetail, setAnalysisDetail] = useState<'received' | 'notReceived' | null>(null)

  const spec: KyokaiPresetSpec | null = useMemo(() => {
    const p = props.presets.find(x => x.code === 'kyokai_3file')
    return p?.spec ?? null
  }, [props.presets])

  const manualFormItems = useMemo(
    () => resolveManualFormItems(props.items, props.manualItemIds),
    [props.items, props.manualItemIds]
  )

  const basePath =
    props.view === 'analysis'
      ? APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_ANALYSIS
      : props.view === 'settings'
        ? APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_SETTINGS
        : props.view === 'manual'
          ? APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_MANUAL
          : APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK

  function selectCampaign(id: string) {
    const q = new URLSearchParams()
    q.set('campaignId', id)
    if (props.view === 'analysis') {
      if (props.orgCampaignId) q.set('orgCampaignId', props.orgCampaignId)
      if (props.orgLayer !== 'all') q.set('layer', props.orgLayer)
    }
    router.push(`${basePath}?${q.toString()}`)
  }

  function pushOrgAnalysis(next: { orgCampaignId?: string; layer?: string }) {
    const q = new URLSearchParams()
    if (props.selectedCampaign?.id) q.set('campaignId', props.selectedCampaign.id)
    const orgId = next.orgCampaignId ?? props.orgCampaignId ?? ''
    if (orgId) q.set('orgCampaignId', orgId)
    const layer = next.layer ?? props.orgLayer
    if (layer !== 'all') q.set('layer', layer)
    router.push(`${APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_ANALYSIS}?${q.toString()}`)
  }

  return (
    <div className="space-y-4 pt-3">
      {message && (
        <p
          className={`text-xs ${
            /失敗|すでに|権限|duplicate|不正/.test(message) ? 'text-red-600' : 'text-slate-600'
          }`}
        >
          {message}
        </p>
      )}

      {props.view === 'settings' && (
        <>
          <section className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">実施回</h2>
            <p className="text-[10px] text-slate-500">
              同じ年度・回は1件だけ登録できます（例: 2026年度
              第1回）。第2回が必要なときだけ回を「2」にして追加してください。
            </p>
            <CampaignForm
              pending={pending}
              onCreate={input => {
                const exists = props.campaigns.some(
                  c => c.fiscal_year === input.fiscal_year && c.round === input.round
                )
                if (exists) {
                  setMessage(
                    `${input.fiscal_year}年度 第${input.round}回はすでに登録されています。回を変えるか、下の一覧から既存の実施回を選んでください。`
                  )
                  return
                }
                startTransition(async () => {
                  const r = await createCampaign(input)
                  setMessage(r.ok ? '実施回を登録しました' : (r.error ?? '失敗'))
                  if (r.ok && r.id) selectCampaign(r.id)
                  else router.refresh()
                })
              }}
            />
            {props.campaigns.length > 0 && (
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-1 px-2 font-medium">年度</th>
                      <th className="text-left py-1 px-2 font-medium">回</th>
                      <th className="text-left py-1 px-2 font-medium">名称</th>
                      <th className="text-left py-1 px-2 font-medium">開始</th>
                      <th className="text-left py-1 px-2 font-medium">終了</th>
                      <th className="text-left py-1 px-2 font-medium">状態</th>
                      <th className="text-left py-1 px-2 font-medium w-10">
                        <span className="sr-only">削除</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.campaigns.map(c => (
                      <tr
                        key={c.id}
                        className={`border-b border-slate-100 ${
                          props.selectedCampaign?.id === c.id ? 'bg-orange-50/60' : ''
                        }`}
                      >
                        <td className="py-1 px-2">{c.fiscal_year}</td>
                        <td className="py-1 px-2">{c.round}</td>
                        <td className="py-1 px-2">{c.title}</td>
                        <td className="py-1 px-2">{c.start_date ?? '—'}</td>
                        <td className="py-1 px-2">{c.end_date ?? '—'}</td>
                        <td className="py-1 px-2">
                          <select
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                            value={c.status}
                            disabled={pending}
                            onChange={e => {
                              const status = e.target.value as HealthCheckCampaign['status']
                              startTransition(async () => {
                                await updateCampaign(c.id, { status })
                                selectCampaign(c.id)
                                router.refresh()
                              })
                            }}
                          >
                            <option value="draft">下書き</option>
                            <option value="open">実施中</option>
                            <option value="closed">終了</option>
                          </select>
                        </td>
                        <td className="py-1 px-2">
                          <button
                            type="button"
                            title="削除"
                            aria-label={`${c.fiscal_year}年度 第${c.round}回を削除`}
                            disabled={pending}
                            className="inline-flex items-center justify-center rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            onClick={() => {
                              if (
                                !confirm(
                                  `${c.fiscal_year}年度 第${c.round}回「${c.title}」を削除しますか？この実施回の受診結果も削除され、元に戻せません。`
                                )
                              ) {
                                return
                              }
                              startTransition(async () => {
                                const r = await deleteCampaign(c.id)
                                setMessage(r.ok ? '実施回を削除しました' : (r.error ?? '失敗'))
                                if (r.ok && props.selectedCampaign?.id === c.id) {
                                  const next = props.campaigns.find(x => x.id !== c.id)
                                  if (next) selectCampaign(next.id)
                                }
                                router.refresh()
                              })
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              健診機関（標準＝自社メイン機関）
            </h2>
            <p className="text-[10px] text-slate-500">
              CSV取込形式のサンプル（結果本表 / 追加 /
              問診）をドロップし、自社メイン機関（標準）の指定を行います。
            </p>
            <InstitutionForm
              pending={pending}
              onCreate={(name, isStandard) => {
                startTransition(async () => {
                  const r = await createInstitution({ name, is_standard: isStandard })
                  setMessage(r.ok ? '機関を登録しました' : (r.error ?? '失敗'))
                  router.refresh()
                })
              }}
            />
            <ul className="text-xs space-y-1">
              {props.institutions.map(inst => (
                <li
                  key={inst.id}
                  className="flex flex-wrap items-center gap-2 py-1 border-b border-slate-100"
                >
                  <span className="font-medium">{inst.name}</span>
                  {inst.is_standard && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700">
                      標準
                    </span>
                  )}
                  {inst.preset_code && (
                    <span className="text-slate-500">形式: {inst.preset_code}</span>
                  )}
                  {!inst.is_standard && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await setStandardInstitution(inst.id)
                          router.refresh()
                        })
                      }
                    >
                      標準にする
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <InstitutionCsvFormatPanel
              institutions={props.institutions}
              presets={props.presets}
              columnMaps={props.columnMaps ?? []}
              pending={pending}
              onApply={(institutionId, presetCode, headersByKind) =>
                new Promise(resolve => {
                  startTransition(async () => {
                    const r = await applyPresetToInstitution(
                      institutionId,
                      presetCode,
                      headersByKind
                    )
                    const presetName =
                      props.presets.find(p => p.code === presetCode)?.name ?? presetCode
                    setMessage(r.ok ? `${presetName} を適用しました` : (r.error ?? '失敗'))
                    router.refresh()
                    resolve(r)
                  })
                })
              }
              onNeedMessage={setMessage}
              onDelete={id => {
                startTransition(async () => {
                  const r = await deleteInstitution(id)
                  setMessage(r.ok ? '機関を削除しました' : (r.error ?? '失敗'))
                  router.refresh()
                })
              }}
            />
          </section>

          <section className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">手入力の項目設定</h2>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setItemSettingsOpen(true)}
              >
                入力項目を設定
              </Button>
            </div>
            <p className="text-[10px] text-slate-500">
              データ取込の手入力に出す検査項目です。表示名は結果本表・追加検査の標準項目名です。
            </p>
            {manualFormItems.length === 0 ? (
              <p className="text-xs text-slate-500">
                設定されている項目はありません。「入力項目を設定」から選んでください。
              </p>
            ) : (
              <div className="space-y-1.5">
                <ul className="flex flex-wrap gap-1.5">
                  {manualFormItems.map(it => (
                    <li
                      key={it.id}
                      className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-800"
                    >
                      {displayItemName(it.code, it.name)}
                    </li>
                  ))}
                </ul>
                {props.manualItemIds.length === 0 && (
                  <p className="text-[10px] text-slate-500">
                    未保存のため既定の12項目です。「入力項目を設定」で保存できます。
                  </p>
                )}
              </div>
            )}
            {itemSettingsOpen && (
              <ManualItemSettingsModal
                open={itemSettingsOpen}
                onOpenChange={open => {
                  setItemSettingsOpen(open)
                  if (!open) router.refresh()
                }}
                items={props.items}
                selectedIds={props.manualItemIds}
              />
            )}
          </section>
        </>
      )}

      {props.view !== 'settings' && props.campaigns.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-600">
            実施回
            <select
              className="ml-2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
              value={props.selectedCampaign?.id ?? ''}
              onChange={e => selectCampaign(e.target.value)}
            >
              {props.campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.fiscal_year}年度 第{c.round}回 {c.title}（{c.status}）
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {props.view !== 'settings' && props.campaigns.length === 0 && (
        <p className="text-xs text-slate-600">
          実施回がありません。
          <Link
            href={APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_SETTINGS}
            className="ml-1 text-primary underline"
          >
            設定
          </Link>
          から追加してください。
        </p>
      )}

      {props.view === 'import' && props.selectedCampaign && spec && (
        <CsvImportPanel
          campaignId={props.selectedCampaign.id}
          institutions={props.institutions}
          spec={spec}
          pending={pending}
          onMessage={setMessage}
        />
      )}

      {props.view === 'manual' && props.selectedCampaign && (
        <ManualEntryPanel
          campaignId={props.selectedCampaign.id}
          institutions={props.institutions}
          formItems={manualFormItems}
          employees={props.employees}
          pending={pending}
          onMessage={setMessage}
        />
      )}

      {props.view === 'analysis' && props.selectedCampaign && props.stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="対象者" value={`${props.stats.targetCount}名`} />
            <StatCard
              label="受診済"
              value={`${props.stats.receivedCount}名`}
              rateLabel="受診率"
              rate={`${props.stats.rate}%`}
              onDetail={() => setAnalysisDetail('received')}
            />
            <StatCard
              label="未受診"
              value={`${props.stats.notReceivedCount}名`}
              rateLabel="未受診率"
              rate={`${
                props.stats.targetCount === 0
                  ? 0
                  : Math.round((props.stats.notReceivedCount / props.stats.targetCount) * 1000) / 10
              }%`}
              onDetail={() => setAnalysisDetail('notReceived')}
            />
            <StatCard
              label="就業判定 未判定"
              value={`${props.stats.pendingJudgmentCount}件`}
              rateLabel="未判定率"
              rate={`${
                props.stats.receivedCount === 0
                  ? 0
                  : Math.round(
                      (props.stats.pendingJudgmentCount / props.stats.receivedCount) * 1000
                    ) / 10
              }%`}
            />
            <StatCard label="就業制限" value={`${props.stats.restrictedCount}名`} />
            <StatCard label="要休業" value={`${props.stats.leaveCount}名`} />
            <StatCard label="保健師面談推奨" value={`${props.stats.nurseRecommendedCount}名`} />
            <StatCard label="産業医面談推奨" value={`${props.stats.doctorRecommendedCount}名`} />
          </div>

          <Dialog
            open={analysisDetail != null}
            onOpenChange={open => {
              if (!open) setAnalysisDetail(null)
            }}
          >
            <DialogContent className="max-h-[80vh] max-w-[960px] flex flex-col gap-0 overflow-hidden rounded-lg p-0">
              <DialogHeader className="rounded-t-lg">
                <DialogTitle>
                  {analysisDetail === 'notReceived'
                    ? '未受診者'
                    : '受診一覧（検査値は表示しません）'}
                </DialogTitle>
                <p className="sr-only">
                  {analysisDetail === 'notReceived'
                    ? '未受診者の一覧です。'
                    : '受診者の一覧です。検査値は表示しません。'}
                </p>
              </DialogHeader>
              <div className="overflow-y-auto overscroll-contain px-6 py-4">
                {analysisDetail === 'notReceived' ? (
                  <NotReceivedTable rows={props.notReceived} />
                ) : (
                  <ReceivedTable rows={props.records} />
                )}
              </div>
            </DialogContent>
          </Dialog>

          <section className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              組織分析（標準総合判定・n&lt;5は抑制）
            </h2>
            <p className="text-[10px] text-slate-500">
              実施回と組織レベルを選び、チャートとリストで組織の健康状況（標準総合判定）を見ます。
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-slate-600">
                実施回
                <select
                  className="mt-1 block px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 min-w-56"
                  value={props.orgCampaignId ?? ''}
                  onChange={e => pushOrgAnalysis({ orgCampaignId: e.target.value })}
                >
                  {props.campaigns.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.fiscal_year}年度 第{c.round}回 {c.title}
                      {c.status === 'open' ? '（実施中）' : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-600">
                組織レベル
                <select
                  className="mt-1 block px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                  value={props.orgLayer}
                  onChange={e => pushOrgAnalysis({ layer: e.target.value })}
                >
                  <option value="all">全社</option>
                  {Array.from({ length: Math.max(1, props.maxOrgLayer ?? 1) }, (_, i) => i + 1).map(
                    n => (
                      <option key={n} value={String(n)}>
                        層{n}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
            <div className="space-y-4">
              <OrgHealthChart rows={props.orgRows} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 mb-2">リスト</p>
                <OrgTable rows={props.orgRows} />
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  rateLabel,
  rate,
  onDetail,
}: {
  label: string
  value: string
  rateLabel?: string
  rate?: string
  onDetail?: () => void
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 flex flex-col">
      <div className={rate != null ? 'grid grid-cols-2 gap-3' : ''}>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-lg font-semibold text-slate-900 mt-1">{value}</p>
        </div>
        {rate != null && (
          <div>
            <p className="text-xs text-slate-500">{rateLabel}</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{rate}</p>
          </div>
        )}
      </div>
      {onDetail && (
        <div className="mt-3 flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={onDetail}>
            詳細表示
          </Button>
        </div>
      )}
    </div>
  )
}

function CampaignForm({
  pending,
  onCreate,
}: {
  pending: boolean
  onCreate: (input: {
    fiscal_year: number
    round: 1 | 2
    title: string
    start_date?: string | null
    end_date?: string | null
  }) => void
}) {
  const year = new Date().getFullYear()
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={e => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onCreate({
          fiscal_year: Number(fd.get('fiscal_year')),
          round: Number(fd.get('round')) as 1 | 2,
          title: String(fd.get('title') || ''),
          start_date: String(fd.get('start_date') || '') || null,
          end_date: String(fd.get('end_date') || '') || null,
        })
      }}
    >
      <label className="text-xs">
        年度
        <input
          name="fiscal_year"
          type="number"
          defaultValue={year}
          className="mt-1 block px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
        />
      </label>
      <label className="text-xs">
        回
        <select
          name="round"
          className="mt-1 block px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
        >
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
      </label>
      <label className="text-xs">
        名称
        <input
          name="title"
          required
          placeholder="定期健診"
          className="mt-1 block px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
        />
      </label>
      <label className="text-xs">
        開始
        <input
          name="start_date"
          type="date"
          className="mt-1 block px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
        />
      </label>
      <label className="text-xs">
        終了
        <input
          name="end_date"
          type="date"
          className="mt-1 block px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
        />
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        実施回を追加
      </Button>
    </form>
  )
}

function InstitutionForm({
  pending,
  onCreate,
}: {
  pending: boolean
  onCreate: (name: string, isStandard: boolean) => void
}) {
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={e => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        onCreate(String(fd.get('name') || ''), fd.get('is_standard') === 'on')
        e.currentTarget.reset()
      }}
    >
      <label className="text-xs">
        機関名
        <input
          name="name"
          required
          className="mt-1 block w-full min-w-80 sm:w-[28rem] px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
        />
      </label>
      <label className="text-xs flex items-center gap-1 pb-1.5">
        <input type="checkbox" name="is_standard" />
        標準（メイン）にする
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        機関を追加
      </Button>
    </form>
  )
}

/** 健診機関向け。CSV取込と同じクリックまたはドロップで形式サンプルを受け取る */
function InstitutionCsvFormatPanel({
  institutions,
  presets,
  columnMaps,
  pending,
  onApply,
  onNeedMessage,
  onDelete,
}: {
  institutions: HealthCheckInstitution[]
  presets: CsvFormatPreset[]
  columnMaps: InstitutionCsvColumnMap[]
  pending: boolean
  onApply: (
    institutionId: string,
    presetCode: string,
    headersByKind: Partial<Record<FileKind, string[]>>
  ) => Promise<{ ok: boolean; error?: string }>
  onNeedMessage: (m: string) => void
  onDelete: (institutionId: string) => void
}) {
  const standardId = institutions.find(i => i.is_standard)?.id ?? institutions[0]?.id ?? ''
  const [institutionId, setInstitutionId] = useState(standardId)
  const [fileNames, setFileNames] = useState<Partial<Record<FileKind, string>>>({})
  const [detailInst, setDetailInst] = useState<HealthCheckInstitution | null>(null)
  const preset = presets.find(p => p.code === 'kyokai_3file') ?? presets[0]
  const resolvedId = institutions.some(i => i.id === institutionId) ? institutionId : standardId
  const disabled = pending || institutions.length === 0
  const mapsByInst = useMemo(() => {
    const m = new Map<string, InstitutionCsvColumnMap[]>()
    for (const row of columnMaps) {
      const list = m.get(row.institution_id) ?? []
      list.push(row)
      m.set(row.institution_id, list)
    }
    return m
  }, [columnMaps])

  async function handleApply() {
    if (!fileNames.main) {
      onNeedMessage('結果本表のCSVを選択してください')
      return
    }
    if (!preset || !resolvedId) {
      onNeedMessage('適用できる形式プリセットがありません')
      return
    }
    const kinds: FileKind[] = ['main', 'additional', 'questionnaire']
    const headersByKind: Partial<Record<FileKind, string[]>> = {}
    for (const kind of kinds) {
      const input = document.getElementById(`inst-format-${kind}`) as HTMLInputElement | null
      const file = input?.files?.[0]
      if (!file || file.size === 0) continue
      const buf = await file.arrayBuffer()
      const { text } = decodeHealthCheckCsvBytes(buf)
      const headers = parseCsvHeaders(text)
      if (headers.length === 0) {
        onNeedMessage('CSVから列名を読めませんでした')
        return
      }
      headersByKind[kind] = headers
    }
    if (!headersByKind.main?.length) {
      onNeedMessage('結果本表のCSVを選択してください')
      return
    }
    const r = await onApply(resolvedId, preset.code, headersByKind)
    if (!r.ok) return
    for (const kind of kinds) {
      const input = document.getElementById(`inst-format-${kind}`) as HTMLInputElement | null
      if (input) input.value = ''
    }
    setFileNames({})
  }

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100">
      <p className="text-xs font-medium text-slate-800">
        CSV形式サンプル（結果本表 / 追加 / 問診）
      </p>
      <p className="text-[10px] text-slate-500">
        機関が使うCSVのサンプルをドロップします。結果本表は必須です。適用すると取込時の列対応に使います。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        <label className="block min-w-0 text-xs">
          適用する機関
          <select
            value={resolvedId}
            disabled={disabled}
            onChange={e => setInstitutionId(e.target.value)}
            className="mt-1 block w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 disabled:opacity-60"
          >
            {institutions.length === 0 && <option value="">機関を先に追加してください</option>}
            {institutions.map(i => (
              <option key={i.id} value={i.id}>
                {i.name}
                {i.is_standard ? '（標準）' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="min-w-0 overflow-x-auto max-h-40 overflow-y-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left font-medium px-3 py-1">機関名</th>
                <th className="text-left font-medium px-3 py-1 w-28">項目詳細</th>
                <th className="w-8 px-1 py-1">
                  <span className="sr-only">削除</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {institutions.map(inst => {
                const registered =
                  (mapsByInst.get(inst.id)?.length ?? 0) > 0 || Boolean(inst.preset_code)
                return (
                  <tr key={inst.id} className="border-t border-slate-100">
                    <td className="px-3 py-1">
                      {inst.name}
                      {inst.is_standard && (
                        <span className="ml-1 text-[10px] text-orange-700">標準</span>
                      )}
                    </td>
                    <td className="px-3 py-1">
                      {registered ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailInst(inst)}
                        >
                          項目詳細
                        </Button>
                      ) : (
                        <span className="text-slate-400">未登録</span>
                      )}
                    </td>
                    <td className="px-1 py-1">
                      <button
                        type="button"
                        title="削除"
                        aria-label={`${inst.name}を削除`}
                        disabled={pending}
                        className="inline-flex items-center justify-center rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        onClick={() => {
                          if (
                            !confirm(
                              `健診機関「${inst.name}」を削除しますか？登録したCSV形式も削除されます。受診結果の機関名は空になります。`
                            )
                          ) {
                            return
                          }
                          if (detailInst?.id === inst.id) setDetailInst(null)
                          onDelete(inst.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {institutions.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-slate-400">
                    機関がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CsvFilePick
          idPrefix="inst-format"
          name="main"
          label="結果本表"
          disabled={disabled}
          fileName={fileNames.main ?? null}
          onFileName={n => setFileNames(prev => ({ ...prev, main: n ?? undefined }))}
        />
        <CsvFilePick
          idPrefix="inst-format"
          name="additional"
          label="追加検査"
          disabled={disabled}
          fileName={fileNames.additional ?? null}
          onFileName={n => setFileNames(prev => ({ ...prev, additional: n ?? undefined }))}
        />
        <CsvFilePick
          idPrefix="inst-format"
          name="questionnaire"
          label="問診"
          disabled={disabled}
          fileName={fileNames.questionnaire ?? null}
          onFileName={n => setFileNames(prev => ({ ...prev, questionnaire: n ?? undefined }))}
        />
      </div>
      <Button
        type="button"
        size="sm"
        disabled={disabled || !resolvedId || !fileNames.main}
        onClick={() => {
          void handleApply()
        }}
      >
        形式を適用
      </Button>
      {detailInst && (
        <InstitutionCsvItemsModal
          open={Boolean(detailInst)}
          onOpenChange={open => {
            if (!open) setDetailInst(null)
          }}
          institutionName={detailInst.name}
          maps={mapsByInst.get(detailInst.id) ?? []}
        />
      )}
    </div>
  )
}

/** CSVファイル選択。ネイティブの file input はクリック可能に見えにくいため枠付きにする */
function CsvFilePick({
  name,
  label,
  disabled,
  fileName,
  onFileName,
  idPrefix = 'health-check-csv',
}: {
  name: FileKind
  label: string
  disabled: boolean
  fileName: string | null
  onFileName: (fileName: string | null) => void
  idPrefix?: string
}) {
  const inputId = `${idPrefix}-${name}`

  function assignFile(file: File | undefined) {
    const input = document.getElementById(inputId) as HTMLInputElement | null
    if (!input) return
    if (!file) {
      input.value = ''
      onFileName(null)
      return
    }
    const dt = new DataTransfer()
    dt.items.add(file)
    input.files = dt.files
    onFileName(file.name)
  }

  return (
    <div className="min-w-0 text-xs">
      <span className="font-medium text-slate-700">{label}</span>
      <label
        htmlFor={inputId}
        onDragOver={e => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={e => {
          e.preventDefault()
          e.stopPropagation()
          if (disabled) return
          assignFile(e.dataTransfer.files?.[0])
        }}
        className={`mt-1 flex min-h-19 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-3 py-2.5 text-center transition-colors ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-60'
            : fileName
              ? 'cursor-pointer border-primary/50 bg-orange-50/60 hover:bg-orange-50'
              : 'cursor-pointer border-slate-300 bg-slate-50 hover:border-primary hover:bg-white'
        }`}
      >
        <Upload className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
        <span className="w-full truncate font-medium text-slate-800">
          {fileName ?? 'CSVを選択'}
        </span>
        <span className="text-[10px] text-slate-500">
          {fileName ? 'クリックで変更' : 'クリックまたはドロップ'}
        </span>
      </label>
      <input
        id={inputId}
        name={name}
        type="file"
        accept=".csv,text/csv"
        disabled={disabled}
        className="sr-only"
        onChange={e => onFileName(e.target.files?.[0]?.name ?? null)}
      />
    </div>
  )
}

function CsvImportPanel({
  campaignId,
  institutions,
  spec,
  pending,
  onMessage,
}: {
  campaignId: string
  institutions: HealthCheckInstitution[]
  spec: KyokaiPresetSpec
  pending: boolean
  onMessage: (m: string) => void
}) {
  const router = useRouter()
  const [institutionId, setInstitutionId] = useState(
    institutions.find(i => i.is_standard)?.id ?? ''
  )
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewCsvImport>>['rows']>([])
  const [peopleCache, setPeopleCache] = useState<Parameters<typeof commitCsvImport>[0]['people']>(
    []
  )
  const [csvBusy, setCsvBusy] = useState<'preview' | 'commit' | null>(null)
  const [fileNames, setFileNames] = useState<Partial<Record<FileKind, string>>>({})
  const busy = csvBusy !== null || pending
  const previewCounts = useMemo(() => {
    let ok = 0
    let error = 0
    let warning = 0
    for (const row of preview) {
      if (row.error) error += 1
      else if (row.warning) warning += 1
      else ok += 1
    }
    return { ok, error, warning }
  }, [preview])

  async function readFile(file: File, kind: FileKind) {
    const buf = await file.arrayBuffer()
    const { text } = decodeHealthCheckCsvBytes(buf)
    return parseHealthCheckCsvText(text, kind, spec)
  }

  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">CSV取込（結果本表 / 追加 / 問診）</h2>
      <p className="text-[10px] text-slate-500">
        個人コードは社員番号（employees.employee_no）と突合します。3ファイルは個人コード＋健診日で結合します。保険証・カルテ番号は取り込みません。保存後、人事は検査値を参照できません。
      </p>
      <form
        className="space-y-3"
        onSubmit={async e => {
          e.preventDefault()
          if (busy) return
          const fd = new FormData(e.currentTarget)
          const inst = String(fd.get('institution_id') || '')
          setInstitutionId(inst)
          setCsvBusy('preview')
          try {
            const kinds: FileKind[] = ['main', 'additional', 'questionnaire']
            const files: Partial<
              Record<FileKind, ReturnType<typeof parseHealthCheckCsvText>['rows']>
            > = {}
            for (const kind of kinds) {
              const f = fd.get(kind) as File | null
              if (f && f.size > 0) {
                const parsed = await readFile(f, kind)
                if (parsed.error) {
                  onMessage(parsed.error)
                  return
                }
                files[kind] = parsed.rows
              }
            }
            const people = mergeCsvPersons(files)
            const r = await previewCsvImport({ campaignId, institutionId: inst, people })
            if (!r.ok) {
              onMessage(r.error ?? 'プレビュー失敗')
              return
            }
            setPreview(r.rows)
            setPeopleCache(people)
            onMessage(`プレビュー ${r.rows.length} 件`)
          } finally {
            setCsvBusy(null)
          }
        }}
      >
        <label className="block w-full md:w-1/2 text-xs">
          機関
          <select
            name="institution_id"
            required
            disabled={busy}
            defaultValue={institutionId}
            className="mt-1 block w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 disabled:opacity-60"
          >
            <option value="">選択</option>
            {institutions.map(i => (
              <option key={i.id} value={i.id}>
                {i.name}
                {i.is_standard ? '（標準）' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CsvFilePick
            name="main"
            label="結果本表"
            disabled={busy}
            fileName={fileNames.main ?? null}
            onFileName={n => setFileNames(prev => ({ ...prev, main: n ?? undefined }))}
          />
          <CsvFilePick
            name="additional"
            label="追加検査"
            disabled={busy}
            fileName={fileNames.additional ?? null}
            onFileName={n => setFileNames(prev => ({ ...prev, additional: n ?? undefined }))}
          />
          <CsvFilePick
            name="questionnaire"
            label="問診"
            disabled={busy}
            fileName={fileNames.questionnaire ?? null}
            onFileName={n => setFileNames(prev => ({ ...prev, questionnaire: n ?? undefined }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={busy}
            aria-busy={csvBusy === 'preview'}
            className={csvBusy === 'preview' ? 'disabled:!opacity-100' : ''}
          >
            {csvBusy === 'preview' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : null}
            {csvBusy === 'preview' ? 'プレビュー中...' : 'プレビュー'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || preview.length === 0}
            aria-busy={csvBusy === 'commit'}
            className={csvBusy === 'commit' ? 'disabled:!opacity-100' : ''}
            onClick={async e => {
              if (busy) return
              const form = e.currentTarget.closest('form')
              const inst = form
                ? (form.elements.namedItem('institution_id') as HTMLSelectElement).value
                : institutionId
              setCsvBusy('commit')
              try {
                const r = await commitCsvImport({
                  campaignId,
                  institutionId: inst,
                  people: peopleCache,
                })
                onMessage(
                  r.ok
                    ? `取込 ${r.imported} 件${r.errors.length ? ` / 警告 ${r.errors.length}` : ''}`
                    : (r.error ?? '失敗')
                )
                if (r.ok) {
                  const kinds: FileKind[] = ['main', 'additional', 'questionnaire']
                  for (const kind of kinds) {
                    const input = document.getElementById(
                      `health-check-csv-${kind}`
                    ) as HTMLInputElement | null
                    if (input) input.value = ''
                  }
                  setFileNames({})
                }
                router.refresh()
              } finally {
                setCsvBusy(null)
              }
            }}
          >
            {csvBusy === 'commit' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : null}
            {csvBusy === 'commit' ? '保存中...' : '確定して保存'}
          </Button>
          {preview.length > 0 && (
            <span className="text-xs text-slate-700">
              OK：{previewCounts.ok}件
              {previewCounts.warning > 0 ? `、警告：${previewCounts.warning}件` : ''}
              、エラー：{previewCounts.error}件
            </span>
          )}
          {csvBusy && (
            <span className="text-[10px] text-slate-500">
              {csvBusy === 'preview' ? 'CSVを解析して照合しています' : '結果を保存しています'}
            </span>
          )}
        </div>
      </form>
      {preview.length > 0 && (
        <div className="overflow-x-auto text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-1 px-2">個人コード</th>
                <th className="text-left py-1 px-2">CSV氏名</th>
                <th className="text-left py-1 px-2">マスタ</th>
                <th className="text-left py-1 px-2">健診日</th>
                <th className="text-left py-1 px-2">状態</th>
              </tr>
            </thead>
            <tbody>
              {preview.slice(0, 50).map(row => (
                <tr
                  key={`${row.employeeNo}-${row.examDateYmd}`}
                  className="border-b border-slate-100"
                >
                  <td className="py-1 px-2 font-mono">{row.employeeNo}</td>
                  <td className="py-1 px-2">{row.csvName}</td>
                  <td className="py-1 px-2">{row.employeeName ?? '—'}</td>
                  <td className="py-1 px-2">{row.examDateYmd}</td>
                  <td className="py-1 px-2 text-red-600">
                    {row.error ?? (row.warning ? `警告: ${row.warning}` : 'OK')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ManualEntryPanel({
  campaignId,
  institutions,
  formItems,
  employees,
  pending,
  onMessage,
}: {
  campaignId: string
  institutions: HealthCheckInstitution[]
  formItems: HealthCheckItem[]
  employees: { id: string; name: string; employee_no: string | null }[]
  pending: boolean
  onMessage: (m: string) => void
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  return (
    <section className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-3">
      <h2 className="text-sm font-semibold text-slate-900">手入力</h2>
      <form
        className="space-y-3"
        onSubmit={e => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const itemPayload = formItems
            .map(it => ({
              itemId: it.id,
              rawValue: String(fd.get(`item_${it.id}`) || ''),
              judgmentRaw: String(fd.get(`judge_${it.id}`) || '') || null,
            }))
            .filter(i => i.rawValue)
          startTransition(async () => {
            const r = await saveManualResult({
              campaignId,
              employeeId: String(fd.get('employee_id')),
              institutionId: String(fd.get('institution_id')),
              examDate: String(fd.get('exam_date')),
              overallJudgmentRaw: String(fd.get('overall') || '') || null,
              items: itemPayload,
            })
            onMessage(r.ok ? '手入力を保存しました' : (r.error ?? '失敗'))
            router.refresh()
          })
        }}
      >
        <div className="flex flex-wrap gap-3">
          <label className="text-xs">
            従業員
            <select
              name="employee_id"
              required
              className="mt-1 block px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            >
              <option value="">選択</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name}（{e.employee_no ?? '番号なし'}）
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            機関
            <select
              name="institution_id"
              required
              className="mt-1 block px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            >
              {institutions.map(i => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            健診日
            <input
              name="exam_date"
              type="date"
              required
              className="mt-1 block px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </label>
          <label className="text-xs">
            総合判定（機関コード）
            <input
              name="overall"
              className="mt-1 block px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
            />
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {formItems.map(it => (
            <label key={it.id} className="text-xs">
              {displayItemName(it.code, it.name)}
              <input
                name={`item_${it.id}`}
                className="mt-1 block w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
              />
            </label>
          ))}
        </div>
        {formItems.length === 0 && (
          <p className="text-xs text-slate-500">
            入力項目がありません。「入力項目を設定」から選んでください。
          </p>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          手入力を保存
        </Button>
      </form>
    </section>
  )
}

function ReceivedTable({ rows }: { rows: HrRecordRow[] }) {
  const columns: Column<HrRecordRow>[] = [
    { key: 'employee_no', label: '社員番号', sortable: true },
    { key: 'employee_name', label: '氏名', sortable: true },
    { key: 'division_name', label: '部署' },
    { key: 'exam_date', label: '受診日', sortable: true },
    { key: 'institution_name', label: '機関' },
    {
      key: 'employment_judgment',
      label: '就業判定',
      render: v => EMPLOYMENT_JUDGMENT_LABEL[v as HrRecordRow['employment_judgment']],
    },
    {
      key: 'nurse_interview_recommended',
      label: '保健師面談',
      render: v => (v ? '推奨' : '—'),
    },
    {
      key: 'doctor_interview_recommended',
      label: '産業医面談',
      render: v => (v ? '推奨' : '—'),
    },
  ]
  return (
    <DataTable
      columns={columns}
      data={rows}
      searchable
      searchPlaceholder="氏名で検索"
      searchKey="employee_name"
      getRowId={r => r.id}
      sortKey="employee_no"
      sortOrder="asc"
    />
  )
}

function NotReceivedTable({ rows }: { rows: NotReceived[] }) {
  const columns: Column<NotReceived>[] = [
    { key: 'employee_no', label: '社員番号', sortable: true },
    { key: 'name', label: '氏名', sortable: true },
    { key: 'division_name', label: '部署' },
  ]
  return (
    <DataTable
      columns={columns}
      data={rows}
      searchable
      searchPlaceholder="氏名で検索"
      searchKey="name"
      getRowId={r => r.id}
      sortKey="employee_no"
      sortOrder="asc"
    />
  )
}

const JUDGMENT_COLORS = [
  '#22c55e',
  '#84cc16',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#a855f7',
  '#64748b',
]

/** 組織別チャートで判定コードの色を揃える */
const JUDGMENT_COLOR_BY_CODE: Record<string, string> = {
  A1: '#22c55e',
  A2: '#84cc16',
  A3: '#eab308',
  B1: '#f97316',
  B2: '#a855f7',
  C1: '#64748b',
  C2: '#ec4899',
  D: '#ef4444',
  E: '#0ea5e9',
  F: '#14b8a6',
  G1: '#16a34a',
  G2: '#4ade80',
}

function colorForJudgmentCode(code: string, index: number): string {
  return JUDGMENT_COLOR_BY_CODE[code] ?? JUDGMENT_COLORS[index % JUDGMENT_COLORS.length]
}

type OrgGroup = {
  division_id: string | null
  division_name: string
  received_count: number
  suppressed: boolean
  parts: { code: string; label: string; count: number; rank: number }[]
}

function groupOrgRows(rows: OrgAnalysisRow[]): OrgGroup[] {
  const map = new Map<string, OrgGroup>()
  for (const r of rows) {
    const key = `${r.division_id ?? 'all'}::${r.division_name}`
    let g = map.get(key)
    if (!g) {
      g = {
        division_id: r.division_id,
        division_name: r.division_name,
        received_count: r.received_count,
        suppressed: r.suppressed,
        parts: [],
      }
      map.set(key, g)
    }
    if (!r.suppressed && r.judgment_code) {
      g.parts.push({
        code: r.judgment_code,
        label: r.judgment_label ?? r.judgment_code,
        count: r.judgment_count ?? 0,
        rank: r.severity_rank ?? 99,
      })
    }
  }
  return [...map.values()]
}

function OrgPieChart({ group }: { group: OrgGroup }) {
  const pieData = group.parts
    .slice()
    .sort((a, b) => a.rank - b.rank || a.code.localeCompare(b.code))
    .map(p => ({
      code: p.code,
      name: p.label,
      value: p.count,
    }))

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-medium text-slate-900 truncate" title={group.division_name}>
        {group.division_name}
      </p>
      <p className="text-[10px] text-slate-500">受診数 {group.received_count}</p>
      <div className="mt-1 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
            >
              {pieData.map((entry, i) => (
                <Cell key={entry.code} fill={colorForJudgmentCode(entry.code, i)} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => [`${v}件`, '件数']} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function OrgHealthChart({ rows }: { rows: OrgAnalysisRow[] }) {
  const groups = useMemo(() => groupOrgRows(rows), [rows])
  const visibleGroups = useMemo(
    () => groups.filter(g => !g.suppressed && g.parts.length > 0),
    [groups]
  )

  if (groups.length === 0) {
    return (
      <div>
        <p className="text-xs font-medium text-slate-700 mb-2">チャート</p>
        <p className="text-xs text-slate-500">チャートに表示するデータがありません。</p>
      </div>
    )
  }

  if (visibleGroups.length === 0) {
    return (
      <div>
        <p className="text-xs font-medium text-slate-700 mb-2">チャート</p>
        <p className="text-xs text-slate-500">n&lt;5のためチャート表示をスキップしました。</p>
      </div>
    )
  }

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-700 mb-2">チャート（組織別・n&lt;5は非表示）</p>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visibleGroups.map(g => (
          <OrgPieChart key={`${g.division_id ?? 'all'}-${g.division_name}`} group={g} />
        ))}
      </div>
    </div>
  )
}

function OrgTable({ rows }: { rows: OrgAnalysisRow[] }) {
  const groups = useMemo(() => groupOrgRows(rows), [rows])
  const columns: Column<OrgGroup>[] = [
    { key: 'division_name', label: '組織' },
    { key: 'received_count', label: '受診数' },
    {
      key: 'suppressed',
      label: '判定分布',
      render: (_v, item) =>
        item.suppressed
          ? 'n<5のため非表示'
          : item.parts.length === 0
            ? '—'
            : item.parts
                .slice()
                .sort((a, b) => a.rank - b.rank)
                .map(p => `${p.code} (${p.count})`)
                .join(' / '),
    },
  ]
  return (
    <DataTable
      columns={columns}
      data={groups}
      getRowId={r => `${r.division_id ?? 'all'}-${r.division_name}`}
    />
  )
}
