'use client'

/**
 * LINE連携状況 — SaaS管理者向けダッシュボードコンポーネント
 *
 * - 連携件数（linked / unlinked / blocked）を表示
 * - 環境変数の設定状況を boolean のみ表示（シークレット値は描画しない）
 * - リッチメニューは CLI 案内テキストのみ（実行ボタンなし）
 */

import { MessageCircle, Settings, CheckCircle2, XCircle, MinusCircle } from 'lucide-react'
import type { LineLinkStats } from '@/features/line/types'

interface Props {
  /** LINE連携の件数集計（SaaS管理者専用） */
  stats: LineLinkStats
  /** 環境変数の設定済みフラグ（boolean のみ受け取る。値は渡さない） */
  envFlags: {
    hasChannelSecret: boolean
    hasChannelAccessToken: boolean
    hasLiffId: boolean
  }
}

export default function SaasLineDashboard({ stats, envFlags }: Props) {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px]">
      {/* ページタイトル */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">LINE連携管理</h1>
        <p className="mt-1 text-sm text-slate-500">
          全テナント横断の LINE 友だち連携状況と環境設定を確認できます。
        </p>
      </div>

      <div className="space-y-4">
        {/* 連携件数カード */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-[#FD7601]" />
            <span className="font-semibold text-slate-800 text-sm">LINE友だち連携状況</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 連携済み */}
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-green-700 font-medium">連携済み</p>
                <p className="text-2xl font-bold text-green-800">{stats.linked}</p>
              </div>
            </div>
            {/* 未連携 */}
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <MinusCircle className="w-5 h-5 text-slate-500 shrink-0" />
              <div>
                <p className="text-xs text-slate-600 font-medium">未連携</p>
                <p className="text-2xl font-bold text-slate-700">{stats.unlinked}</p>
              </div>
            </div>
            {/* ブロック済み */}
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-xs text-red-700 font-medium">ブロック済み</p>
                <p className="text-2xl font-bold text-red-800">{stats.blocked}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 環境変数設定カード */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-[#FD7601]" />
            <span className="font-semibold text-slate-800 text-sm">環境変数の設定状況</span>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            シークレット値は表示しません。設定済みかどうかのみ確認できます。
          </p>
          <div className="space-y-2">
            <EnvRow label="LINE_CHANNEL_SECRET" isSet={envFlags.hasChannelSecret} />
            <EnvRow label="LINE_CHANNEL_ACCESS_TOKEN" isSet={envFlags.hasChannelAccessToken} />
            <EnvRow label="NEXT_PUBLIC_LIFF_ID" isSet={envFlags.hasLiffId} />
          </div>
        </div>

        {/* リッチメニュー設定カード */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-[#FD7601]" />
            <span className="font-semibold text-slate-800 text-sm">リッチメニューの設定</span>
          </div>
          <p className="text-sm text-slate-700 mb-3">
            リッチメニューは CLI スクリプトで設定します。
          </p>
          <div className="rounded-lg bg-slate-900 px-4 py-3 font-mono text-xs text-slate-100">
            node scripts/setup-line-rich-menu.mjs
          </div>
          <p className="mt-2 text-xs text-slate-500">
            CLI{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-slate-700">
              scripts/setup-line-rich-menu.mjs
            </code>{' '}
            で設定してください。実行ボタンは用意していません（意図しない上書きを防ぐため）。
          </p>
        </div>
      </div>
    </div>
  )
}

/** 環境変数の設定状況を1行で表示するサブコンポーネント */
function EnvRow({ label, isSet }: { label: string; isSet: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <code className="text-xs font-mono text-slate-700">{label}</code>
      {isSet ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
          <CheckCircle2 className="w-3.5 h-3.5" />
          設定済み
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
          <XCircle className="w-3.5 h-3.5" />
          未設定
        </span>
      )}
    </div>
  )
}
