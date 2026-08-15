'use client'

import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { DashboardScreen, UiDashboardElement } from '../types'
import {
  buildSidebarClassGroups,
  visibleKeysForScreen,
  type PreviewCategory,
  type PreviewClass,
  type PreviewClassIndex,
  type PreviewService,
} from '../visibility'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantName: string
  elements: UiDashboardElement[]
  contractedServiceIds: Set<string>
  hiddenElementIds: Set<string>
  services?: PreviewService[]
  categories?: PreviewCategory[]
  classes?: PreviewClass[]
  classIndex?: PreviewClassIndex[]
}

const TOP_TASKS = ['top.card.condition_checkin', 'top.card.important_task', 'top.card.stress_check']
const TOP_NOTICES = [
  'top.notice.consultation',
  'top.notice.kudos',
  'top.notice.questionnaire',
  'top.notice.lifecycle',
]
const TOP_QUICK = [
  'top.quick_access.interview_booking',
  'top.quick_access.telework',
  'top.quick_access.qr_clock',
  'top.quick_access.overtime_approve',
]
const ADM_BUTTONS = [
  'adm.button.consultation_pending',
  'adm.button.hr_kpi',
  'adm.button.manual',
  'adm.button.ai_hr_assistant',
]
const ADM_KPIS = [
  'adm.kpi.headcount',
  'adm.kpi.hired_this_month',
  'adm.kpi.turnover',
  'adm.kpi.open_positions',
]
const ADM_WELLBEING = [
  'adm.card.pulse',
  'adm.card.one_on_one',
  'adm.card.stress_check',
  'adm.card.kudos',
  'adm.card.condition',
  'adm.card.consultation',
  'adm.card.events',
]
const ADM_GROWTH = [
  'adm.card.skill_map',
  'adm.card.evaluation',
  'adm.card.career',
  'adm.card.elearning',
  'adm.card.survey',
]

function labelOf(elements: UiDashboardElement[], key: string, fallback: string) {
  return elements.find(el => el.element_key === key)?.label ?? fallback
}

function PreviewChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-xs">
      {children}
    </span>
  )
}

function PreviewCard({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs">
      <p className="text-xs font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-[10px] text-slate-400">サンプル表示</p>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <p className="py-8 text-center text-xs text-slate-400">{text}</p>
}

function PreviewSidebar({
  screen,
  groups,
}: {
  screen: DashboardScreen
  groups: ReturnType<typeof buildSidebarClassGroups>
}) {
  return (
    <aside className="flex w-48 shrink-0 flex-col border-r border-[#e2e6ec] bg-white">
      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        <div>
          <h3 className="mb-1.5 px-2 text-[10px] font-medium text-[#57606a]">概要</h3>
          <div className="mb-2 border-b border-[#e2e6ec] pb-2">
            <div className="rounded-lg border-l-2 border-[#FD7601] bg-[#fff3e6] px-2 py-1 text-[11px] font-medium text-[#FD7601]">
              ダッシュボード
            </div>
          </div>
        </div>
        {groups.map(group => (
          <div key={group.id}>
            <h3 className="mb-1.5 px-2 text-[10px] font-medium text-[#57606a]">{group.name}</h3>
            <nav className="mb-2 space-y-0.5 border-b border-[#e2e6ec] pb-2">
              {group.categories.map(cat => (
                <div
                  key={cat.id}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#24292f]"
                >
                  {cat.name}
                </div>
              ))}
            </nav>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="px-2 text-[10px] text-slate-400">
            契約サービスに対応するメニューがありません
          </p>
        )}
        <div className="px-2 py-1 text-[11px] text-[#57606a]">
          {screen === 'adm' ? 'ポータルへ戻る' : 'ログアウト'}
        </div>
      </div>
      <div className="border-t border-[#e2e6ec] px-3 py-3">
        <p className="truncate text-[11px] font-medium text-[#24292f]">山田 太郎</p>
        <p className="text-[10px] text-[#57606a]">
          {screen === 'adm' ? 'テナント管理者' : '従業員'}
        </p>
      </div>
    </aside>
  )
}

export function DashboardPreviewModal({
  open,
  onOpenChange,
  tenantName,
  elements,
  contractedServiceIds,
  hiddenElementIds,
  services = [],
  categories = [],
  classes = [],
  classIndex = [],
}: Props) {
  const [screen, setScreen] = useState<DashboardScreen>('top')
  const sidebarGroups = useMemo(
    () =>
      buildSidebarClassGroups(
        screen,
        contractedServiceIds,
        services,
        categories,
        classes,
        classIndex
      ),
    [screen, contractedServiceIds, services, categories, classes, classIndex]
  )
  const visible = useMemo(
    () => visibleKeysForScreen(elements, screen, contractedServiceIds, hiddenElementIds),
    [elements, screen, contractedServiceIds, hiddenElementIds]
  )
  const v = (key: string) => visible.has(key)

  const shownTasks = TOP_TASKS.filter(v)
  const shownNotices = TOP_NOTICES.filter(v)
  const shownQuick = TOP_QUICK.filter(v)
  const shownAdmButtons = ADM_BUTTONS.filter(v)
  const shownKpis = ADM_KPIS.filter(v)
  const shownWellbeing = ADM_WELLBEING.filter(v)
  const shownGrowth = ADM_GROWTH.filter(v)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] max-w-[1100px] overflow-hidden p-0"
        closeButtonClassName="text-white hover:bg-white/15 hover:text-white"
      >
        <DialogHeader className="rounded-t-3xl border-b-0 bg-sky-600 px-6 py-4 pr-14 text-white sm:px-8 sm:py-5 sm:pr-16">
          <DialogTitle className="text-white">表示シミュレーション</DialogTitle>
          <p className="text-xs text-sky-100">
            {tenantName} の設定で /top・/adm
            に出る要素とサイドメニューの配置イメージです。実データは表示しません。
          </p>
        </DialogHeader>

        <div className="flex flex-col overflow-hidden">
          <div className="flex gap-2 border-b border-slate-200 px-6 py-3">
            {(
              [
                { key: 'top' as const, label: '一般画面 /top' },
                { key: 'adm' as const, label: '管理画面 /adm' },
              ] as const
            ).map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setScreen(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  screen === tab.key
                    ? 'bg-[#FD7601] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex max-h-[60vh] overflow-hidden bg-[#F9FAFB]">
            <PreviewSidebar screen={screen} groups={sidebarGroups} />
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              {screen === 'top' ? (
                <div className="mx-auto max-w-[800px] space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] text-slate-400">従業員</p>
                      <p className="text-sm font-bold text-slate-900">
                        山田 太郎 さん、お疲れ様です！
                      </p>
                    </div>
                    {v('top.button.hr_inquiry') && (
                      <PreviewChip>
                        {labelOf(elements, 'top.button.hr_inquiry', '人事へのお問合せ')}
                      </PreviewChip>
                    )}
                  </div>

                  {shownTasks.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {shownTasks.map(key => (
                        <PreviewCard key={key} title={labelOf(elements, key, key)} />
                      ))}
                    </div>
                  )}

                  {(v('top.section.announcements') || v('top.section.quick_access')) && (
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {v('top.section.announcements') && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-xs font-bold text-slate-800">お知らせ</p>
                          {shownNotices.length === 0 ? (
                            <p className="text-[11px] text-slate-400">
                              通知カードなし（通常お知らせのみ）
                            </p>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {shownNotices.map(key => (
                                <PreviewChip key={key}>{labelOf(elements, key, key)}</PreviewChip>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {v('top.section.quick_access') && (
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <p className="mb-2 text-xs font-bold text-slate-800">クイックアクセス</p>
                          {shownQuick.length === 0 ? (
                            <p className="text-[11px] text-slate-400">
                              表示するショートカットがありません
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {shownQuick.map(key => (
                                <PreviewChip key={key}>{labelOf(elements, key, key)}</PreviewChip>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {shownTasks.length === 0 &&
                    !v('top.section.announcements') &&
                    !v('top.section.quick_access') &&
                    !v('top.button.hr_inquiry') && (
                      <EmptyHint text="この設定では /top に出る要素がありません" />
                    )}
                </div>
              ) : (
                <div className="mx-auto max-w-[800px] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-900">管理：人事ダッシュボード</p>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {shownAdmButtons.map(key => (
                        <PreviewChip key={key}>{labelOf(elements, key, key)}</PreviewChip>
                      ))}
                    </div>
                  </div>

                  {shownKpis.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {shownKpis.map(key => (
                        <PreviewCard key={key} title={labelOf(elements, key, key)} />
                      ))}
                    </div>
                  )}

                  {v('adm.section.wellbeing') && shownWellbeing.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="mb-2 text-xs font-bold text-slate-800">
                        サーベイ・ウェルビーイング
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {shownWellbeing.map(key => (
                          <PreviewCard key={key} title={labelOf(elements, key, key)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {v('adm.section.growth') && shownGrowth.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="mb-2 text-xs font-bold text-slate-800">学習・成長</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {shownGrowth.map(key => (
                          <PreviewCard key={key} title={labelOf(elements, key, key)} />
                        ))}
                      </div>
                    </div>
                  )}

                  {v('adm.section.toolbox') && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-xs font-bold text-slate-800">
                        {labelOf(elements, 'adm.section.toolbox', 'ツールボックス')}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">ショートカット一覧エリア</p>
                    </div>
                  )}

                  {shownKpis.length === 0 &&
                    shownAdmButtons.length === 0 &&
                    !v('adm.section.wellbeing') &&
                    !v('adm.section.growth') &&
                    !v('adm.section.toolbox') && (
                      <EmptyHint text="この設定では /adm に出る要素がありません" />
                    )}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DashboardPreviewButton({
  tenantName,
  elements,
  contractedServiceIds,
  hiddenElementIds,
  services,
  categories,
  classes,
  classIndex,
  disabled,
}: Omit<Props, 'open' | 'onOpenChange'> & { disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        表示シミュレーション
      </button>
      <DashboardPreviewModal
        open={open}
        onOpenChange={setOpen}
        tenantName={tenantName}
        elements={elements}
        contractedServiceIds={contractedServiceIds}
        hiddenElementIds={hiddenElementIds}
        services={services}
        categories={categories}
        classes={classes}
        classIndex={classIndex}
      />
    </>
  )
}
