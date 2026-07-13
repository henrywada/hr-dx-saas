'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'
import type { ReferralPosting, ReferralRankingItem } from '@/features/referral/types'
import { ReferralPostingCard } from '@/features/referral/components/ReferralPostingCard'
import { ReferralRankingCard } from '@/features/referral/components/ReferralRankingCard'
import { NominationForm } from '@/features/referral/components/NominationForm'
import { ReferralHelpModalTrigger } from '@/features/referral/components/ReferralHelpModalTrigger'
import TenantBackLink from '@/components/common/TenantBackLink'

interface ReferralFormPageClientProps {
  postings: ReferralPosting[]
  ranking: ReferralRankingItem[]
}

/** 従業員向けリファラルページ クライアント側：求人一覧 + 推薦モーダル + ランキング */
export function ReferralFormPageClient({ postings, ranking }: ReferralFormPageClientProps) {
  // 選択中の求人（null = モーダル非表示）
  const [selectedPosting, setSelectedPosting] = useState<ReferralPosting | null>(null)
  // 推薦成功メッセージ
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 推薦ボタン押下時：対応する求人を selectedPosting にセット
  const handleNominate = (postingId: string) => {
    const posting = postings.find(p => p.id === postingId) ?? null
    setSelectedPosting(posting)
    setSuccessMessage(null)
  }

  // 推薦成功時
  const handleSuccess = () => {
    setSelectedPosting(null)
    setSuccessMessage('推薦を受け付けました。ありがとうございます！')
  }

  return (
    <div className="px-4 sm:px-6 mx-auto w-full max-w-[1200px] space-y-8">
      {/* ページヘッダー */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">社員紹介採用（リファラル）</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            知人・友人を紹介して採用につながると報奨金がもらえます。
            下記の求人から紹介したい求人を選んで推薦フォームをご利用ください。
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-2">
            <ReferralHelpModalTrigger />
            <TenantBackLink />
          </div>
          <Link
            href={APP_ROUTES.TENANT.REFERRAL_MY}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline mt-1"
          >
            マイ推薦一覧へ
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* 推薦成功メッセージ */}
      {successMessage && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* 求人カードグリッド */}
      {postings.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-slate-400 text-sm">現在募集中のリファラル求人はありません</p>
        </div>
      ) : (
        <section>
          <h2 className="text-base font-semibold text-slate-700 mb-4">募集中の求人</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {postings.map(posting => (
              <ReferralPostingCard key={posting.id} posting={posting} onNominate={handleNominate} />
            ))}
          </div>
        </section>
      )}

      {/* 推薦ランキング */}
      {ranking.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-slate-700 mb-4">
            推薦ランキング（社内 Top 5）
          </h2>
          <div className="max-w-md">
            <ReferralRankingCard ranking={ranking} />
          </div>
        </section>
      )}

      {/* 推薦フォームモーダル */}
      {selectedPosting && (
        <NominationForm
          posting={selectedPosting}
          onClose={() => setSelectedPosting(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
