'use client'

import { useState, useTransition } from 'react'
import { previewDataMigration, commitDataMigration } from '@/features/data-migration/actions'
import { MIGRATION_TEMP_PASSWORD } from '@/features/data-migration/types'
import type {
  MigrationCommitResult,
  MigrationPreview,
  MigrationScope,
  MigrationTenantOption,
  PreviewIssue,
} from '@/features/data-migration/types'

type Props = {
  tenants: MigrationTenantOption[]
}

type StepState = {
  preview: MigrationPreview | null
  result: MigrationCommitResult | null
  message: string | null
  skipErrors: boolean
}

const EMPTY_STEP: StepState = {
  preview: null,
  result: null,
  message: null,
  skipErrors: false,
}

function Card({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </header>
      {children}
    </section>
  )
}

function FileInput({
  name,
  label,
  accept,
  onChange,
}: {
  name: string
  label: string
  accept: string
  onChange?: () => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      <input
        type="file"
        name={name}
        accept={accept}
        onChange={onChange}
        className="block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1"
      />
    </label>
  )
}

function IssueList({ issues }: { issues: PreviewIssue[] }) {
  if (issues.length === 0) return null
  return (
    <ul className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200 text-xs">
      {issues.slice(0, 50).map((issue, i) => (
        <li
          key={`${issue.source}-${i}`}
          className={`border-b border-slate-100 px-3 py-1 ${
            issue.level === 'error' ? 'text-red-700' : 'text-amber-700'
          }`}
        >
          {issue.employeeNo ? `${issue.employeeNo}: ` : ''}
          {issue.message}
        </li>
      ))}
    </ul>
  )
}

function ResultPanel({ result, scope }: { result: MigrationCommitResult; scope: MigrationScope }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-900">結果表示</p>
      {result.ok ? (
        <p className="mt-1 text-xs text-emerald-700">取込が完了しました。</p>
      ) : (
        <p className="mt-1 text-xs text-red-600">{result.error}</p>
      )}
      <ul className="mt-2 space-y-0.5 text-xs text-slate-700">
        {scope === 'employee' && (
          <>
            <li>部署 新規 {result.divisionsCreated}</li>
            <li>
              従業員 新規 {result.employeesCreated} / 更新 {result.employeesUpdated}
            </li>
            <li>スキップ {result.skipped}</li>
          </>
        )}
        {scope === 'health' && <li>健診 {result.healthImported} 件</li>}
        {scope === 'stress' && <li>ストレスチェック {result.stressImported} 件</li>}
      </ul>
      {result.errors.length > 0 && (
        <ul className="mt-2 max-h-40 overflow-auto text-xs text-amber-800">
          {result.errors.slice(0, 40).map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PreviewPanel({ preview, scope }: { preview: MigrationPreview; scope: MigrationScope }) {
  const issues = preview.issues.filter(i => i.source === scope)
  const errorCount = issues.filter(i => i.level === 'error').length
  const warningCount = issues.filter(i => i.level === 'warning').length

  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-3">
      <p className="text-xs font-semibold text-slate-900">プレビュー</p>
      {scope === 'employee' && (
        <>
          <p className="mt-1 text-xs text-slate-600">
            {preview.employees.total} 行 / 新規 {preview.employees.createCount} / 更新{' '}
            {preview.employees.updateCount} / 部署 {preview.employees.divisionCount}
          </p>
          {preview.maxEmployeesError && (
            <p className="mt-1 text-xs text-red-600">{preview.maxEmployeesError}</p>
          )}
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            新規（および未ログインの既存）は <code>app_role=employee</code>
            、CSV の <code>mailadress</code> でメール確認済み登録します。仮パスワードは{' '}
            <code>{MIGRATION_TEMP_PASSWORD}</code> です。
          </p>
        </>
      )}
      {scope === 'health' && (
        <p className="mt-1 text-xs text-slate-600">
          {preview.health.total} 件
          {preview.health.fiscalYears.length > 0
            ? ` / 年度 ${preview.health.fiscalYears.join(', ')}`
            : ''}
        </p>
      )}
      {scope === 'stress' && (
        <p className="mt-1 text-xs text-slate-600">
          {preview.stress.total} 件
          {preview.stress.dates.length > 0 ? ` / ${preview.stress.dates.join(', ')}` : ''}
        </p>
      )}
      <p className="mt-2 text-xs">
        エラー {errorCount} 件 / 警告 {warningCount} 件
      </p>
      <IssueList issues={issues} />
    </div>
  )
}

function MigrationStepForm({
  scope,
  tenantId,
  step,
  isBusy,
  isActive,
  onSkipChange,
  onPreview,
  onCommit,
  children,
}: {
  scope: MigrationScope
  tenantId: string
  step: StepState
  isBusy: boolean
  isActive: boolean
  onSkipChange: (checked: boolean) => void
  onPreview: (form: HTMLFormElement) => void
  onCommit: (form: HTMLFormElement) => void
  children: React.ReactNode
}) {
  const scopedIssues = (step.preview?.issues ?? []).filter(i => i.source === scope)
  const errorCount = scopedIssues.filter(i => i.level === 'error').length
  const canExecute = Boolean(step.preview) && !(errorCount > 0 && !step.skipErrors)

  return (
    <form
      className="space-y-3"
      onSubmit={e => {
        e.preventDefault()
        onPreview(e.currentTarget)
      }}
    >
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="tenantId" value={tenantId} />
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isBusy || !tenantId}
          className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {isBusy && isActive ? '処理中…' : 'プレビュー'}
        </button>
        <button
          type="button"
          disabled={isBusy || !tenantId || !canExecute}
          onClick={e => {
            const form = e.currentTarget.closest('form')
            if (!form) return
            onCommit(form)
          }}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {isBusy && isActive ? '実行中…（数十秒〜数分かかることがあります）' : '実行'}
        </button>
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={step.skipErrors}
            onChange={e => onSkipChange(e.target.checked)}
            className="rounded border-slate-300"
          />
          エラー行をスキップして取り込む
        </label>
      </div>
      {step.message && <p className="text-xs text-red-600">{step.message}</p>}
      {step.preview && <PreviewPanel preview={step.preview} scope={scope} />}
      {step.result && <ResultPanel result={step.result} scope={scope} />}
    </form>
  )
}

export default function DataMigrationClient({ tenants }: Props) {
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? '')
  const [steps, setSteps] = useState<Record<MigrationScope, StepState>>({
    employee: { ...EMPTY_STEP },
    health: { ...EMPTY_STEP },
    stress: { ...EMPTY_STEP },
  })
  const [pendingScope, setPendingScope] = useState<MigrationScope | null>(null)
  const [isPending, startTransition] = useTransition()

  const selected = tenants.find(t => t.id === tenantId)

  function updateStep(scope: MigrationScope, patch: Partial<StepState>) {
    setSteps(prev => ({ ...prev, [scope]: { ...prev[scope], ...patch } }))
  }

  function resetStep(scope: MigrationScope) {
    setSteps(prev => ({
      ...prev,
      [scope]: { ...EMPTY_STEP, skipErrors: prev[scope].skipErrors },
    }))
  }

  function collectForm(form: HTMLFormElement, scope: MigrationScope) {
    const fd = new FormData(form)
    fd.set('tenantId', tenantId)
    fd.set('scope', scope)
    fd.set('skipErrors', steps[scope].skipErrors ? '1' : '0')
    return fd
  }

  function runPreview(scope: MigrationScope, form: HTMLFormElement) {
    updateStep(scope, { message: null, result: null })
    setPendingScope(scope)
    startTransition(async () => {
      const r = await previewDataMigration(collectForm(form, scope))
      setPendingScope(null)
      if (!r.ok) {
        updateStep(scope, { preview: null, message: r.error ?? 'プレビューに失敗しました' })
        return
      }
      updateStep(scope, { preview: r.preview ?? null, message: null })
    })
  }

  function runCommit(scope: MigrationScope, form: HTMLFormElement) {
    updateStep(scope, { message: null })
    setPendingScope(scope)
    startTransition(async () => {
      const r = await commitDataMigration(collectForm(form, scope))
      setPendingScope(null)
      updateStep(scope, {
        result: r,
        message: null,
      })
    })
  }

  const busy = isPending

  return (
    <div className="space-y-4">
      <Card
        title="1. 移行先テナント"
        description="書き込み先を必ず確認してください。他テナントには保存しません。"
      >
        <select
          value={tenantId}
          onChange={e => {
            setTenantId(e.target.value)
            setSteps({
              employee: { ...EMPTY_STEP },
              health: { ...EMPTY_STEP },
              stress: { ...EMPTY_STEP },
            })
          }}
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
          disabled={busy}
        >
          {tenants.length === 0 && <option value="">テナントがありません</option>}
          {tenants.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}（登録 {t.registered_user_count} / 上限 {t.max_employees ?? 'なし'}）
            </option>
          ))}
        </select>
        {selected && (
          <p className="mt-2 text-xs text-slate-500">
            現在の登録人数 {selected.registered_user_count} 名
            {selected.max_employees != null ? ` / 上限 ${selected.max_employees} 名` : ''}
          </p>
        )}
      </Card>

      <p className="text-sm font-semibold text-slate-900">2. 移行ファイル</p>
      <p className="-mt-2 text-xs text-slate-500">
        系統ごとにプレビュー → 実行 →
        結果表示してください。健診・ストレスチェックは社員番号で突合します。
      </p>

      <Card
        title="2-1. 従業員データ"
        description="employee.csv（UTF-16 TAB 可）。mailadress 列必須。"
      >
        <MigrationStepForm
          scope="employee"
          tenantId={tenantId}
          step={steps.employee}
          isBusy={busy}
          isActive={pendingScope === 'employee'}
          onSkipChange={checked => updateStep('employee', { skipErrors: checked })}
          onPreview={form => runPreview('employee', form)}
          onCommit={form => runCommit('employee', form)}
        >
          <FileInput
            name="employee"
            label="従業員（employee.csv）"
            accept=".csv,text/csv"
            onChange={() => resetStep('employee')}
          />
        </MigrationStepForm>
      </Card>

      <Card
        title="2-2. 健診データ"
        description="kenshin1 / kenshin2 / monshin（CP932）。社員番号が従業員マスタに存在する必要があります。"
      >
        <MigrationStepForm
          scope="health"
          tenantId={tenantId}
          step={steps.health}
          isBusy={busy}
          isActive={pendingScope === 'health'}
          onSkipChange={checked => updateStep('health', { skipErrors: checked })}
          onPreview={form => runPreview('health', form)}
          onCommit={form => runCommit('health', form)}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FileInput
              name="kenshin1"
              label="健診 結果本表（kenshin1.csv）"
              accept=".csv,text/csv"
              onChange={() => resetStep('health')}
            />
            <FileInput
              name="kenshin2"
              label="健診 追加検査（kenshin2.csv）"
              accept=".csv,text/csv"
              onChange={() => resetStep('health')}
            />
            <FileInput
              name="monshin"
              label="問診（monshin.csv）"
              accept=".csv,text/csv"
              onChange={() => resetStep('health')}
            />
          </div>
        </MigrationStepForm>
      </Card>

      <Card
        title="2-3. ストレスチェックデータ"
        description="stress-check.csv。社員番号が従業員マスタに存在する必要があります。"
      >
        <MigrationStepForm
          scope="stress"
          tenantId={tenantId}
          step={steps.stress}
          isBusy={busy}
          isActive={pendingScope === 'stress'}
          onSkipChange={checked => updateStep('stress', { skipErrors: checked })}
          onPreview={form => runPreview('stress', form)}
          onCommit={form => runCommit('stress', form)}
        >
          <FileInput
            name="stress"
            label="ストレスチェック（stress-check.csv）"
            accept=".csv,text/csv"
            onChange={() => resetStep('stress')}
          />
        </MigrationStepForm>
      </Card>
    </div>
  )
}
