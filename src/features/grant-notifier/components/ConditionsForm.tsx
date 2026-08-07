'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import { saveGrantConditions } from '@/features/grant-notifier/actions'
import type { GrantConditionView } from '@/features/grant-notifier/queries'

/**
 * 配信条件の設定フォーム。
 * 閲覧は自テナントのメンバー、編集はテナント管理者のみ（RLS でも強制される）。
 */

interface ConditionsFormProps {
  condition: GrantConditionView | null
  canEdit: boolean
}

/** カンマ・読点・改行区切りの文字列を、trim・空要素除去した配列にする */
function parseList(value: string): string[] {
  return value
    .split(/[,、\n]/)
    .map(v => v.trim())
    .filter(v => v !== '')
}

/** 数値入力をパースする。空・非数は null */
function parseNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-900 transition-colors focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-[#FD7601]/30 disabled:bg-slate-50 disabled:text-slate-500'

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

export function ConditionsForm({ condition, canEdit }: ConditionsFormProps) {
  const [industries, setIndustries] = useState(condition?.industries.join('、') ?? '')
  const [employeeCount, setEmployeeCount] = useState(
    condition?.employeeCount != null ? String(condition.employeeCount) : ''
  )
  const [capital, setCapital] = useState(
    condition?.capital != null ? String(condition.capital) : ''
  )
  const [prefectures, setPrefectures] = useState(condition?.prefectures.join('、') ?? '')
  const [categories, setCategories] = useState(condition?.categories.join('、') ?? '')
  const [keywords, setKeywords] = useState(condition?.keywords ?? '')
  const [notifyEmails, setNotifyEmails] = useState(condition?.notifyEmails.join('、') ?? '')
  const [deliveryFrequency, setDeliveryFrequency] = useState<'weekly' | 'monthly'>(
    condition?.deliveryFrequency ?? 'weekly'
  )

  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setMessage(null)

    startTransition(async () => {
      const result = await saveGrantConditions({
        industries: parseList(industries),
        employeeCount: parseNumber(employeeCount),
        capital: parseNumber(capital),
        prefectures: parseList(prefectures),
        categories: parseList(categories),
        keywords,
        notifyEmails: parseList(notifyEmails),
        deliveryFrequency,
      })

      setMessage(
        result.ok
          ? { tone: 'success', text: '配信条件を保存しました。' }
          : { tone: 'error', text: result.error ?? '保存に失敗しました' }
      )
    })
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-4 px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-[#FD7601]">助成金情報配信</p>
          <h1 className="text-xl font-semibold text-slate-900">配信条件</h1>
          <p className="text-sm text-slate-500">
            設定した条件に合う助成金を、週次または月次でメール配信します。
            {!canEdit && '（編集はテナント管理者のみ。現在は閲覧のみ可能です）'}
          </p>
        </div>
        <Link
          href={APP_ROUTES.TENANT.ADMIN_GRANT_NOTIFIER}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          助成金情報配信
        </Link>
      </header>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-4 text-xs ${
            message.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
          role="status"
        >
          {message.tone === 'success' ? (
            <CheckCircle2 className="mt-px h-4 w-4 shrink-0" strokeWidth={2} />
          ) : (
            <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} />
          )}
          {message.text}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-xs"
      >
        <fieldset disabled={!canEdit || isPending} className="space-y-4">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">会社の情報</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field
                label="業種"
                htmlFor="industries"
                hint="読点・カンマ区切りで複数可。例: 製造業、情報通信業"
              >
                <input
                  id="industries"
                  className={INPUT_CLASS}
                  value={industries}
                  onChange={e => setIndustries(e.target.value)}
                  placeholder="製造業、情報通信業"
                />
              </Field>
              <Field
                label="所在地（都道府県）"
                htmlFor="prefectures"
                hint="未指定なら全国対象の助成金のみ配信されます"
              >
                <input
                  id="prefectures"
                  className={INPUT_CLASS}
                  value={prefectures}
                  onChange={e => setPrefectures(e.target.value)}
                  placeholder="長野県、東京都"
                />
              </Field>
              <Field label="従業員数" htmlFor="employeeCount" hint="中小企業要件の判定に使用">
                <input
                  id="employeeCount"
                  type="number"
                  min={0}
                  className={INPUT_CLASS}
                  value={employeeCount}
                  onChange={e => setEmployeeCount(e.target.value)}
                  placeholder="120"
                />
              </Field>
              <Field label="資本金（円）" htmlFor="capital">
                <input
                  id="capital"
                  type="number"
                  min={0}
                  className={INPUT_CLASS}
                  value={capital}
                  onChange={e => setCapital(e.target.value)}
                  placeholder="30000000"
                />
              </Field>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-semibold text-slate-900">関心のある分野</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field
                label="関心カテゴリ"
                htmlFor="categories"
                hint="例: 雇用、育成、設備投資、IT導入、両立支援"
              >
                <input
                  id="categories"
                  className={INPUT_CLASS}
                  value={categories}
                  onChange={e => setCategories(e.target.value)}
                  placeholder="雇用、育成、両立支援"
                />
              </Field>
              <Field
                label="キーワード（自由記述）"
                htmlFor="keywords"
                hint="AI 判定の参考にする補足情報"
              >
                <input
                  id="keywords"
                  className={INPUT_CLASS}
                  maxLength={500}
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="正社員化、育児と仕事の両立支援"
                />
              </Field>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <h2 className="text-sm font-semibold text-slate-900">配信設定</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field
                label="通知先メールアドレス"
                htmlFor="notifyEmails"
                hint="読点・カンマ区切りで複数可（最大20件）。未設定だと配信されません"
              >
                <input
                  id="notifyEmails"
                  className={INPUT_CLASS}
                  value={notifyEmails}
                  onChange={e => setNotifyEmails(e.target.value)}
                  placeholder="hr@example.com、soumu@example.com"
                />
              </Field>
              <Field label="配信頻度" htmlFor="deliveryFrequency">
                <select
                  id="deliveryFrequency"
                  className={INPUT_CLASS}
                  value={deliveryFrequency}
                  onChange={e =>
                    setDeliveryFrequency(e.target.value === 'monthly' ? 'monthly' : 'weekly')
                  }
                >
                  <option value="weekly">週次（毎週月曜の朝）</option>
                  <option value="monthly">月次（その月の初回のみ）</option>
                </select>
              </Field>
            </div>
          </div>
        </fieldset>

        {canEdit && (
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-[#FD7601] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? '保存中…' : '条件を保存'}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
