import React from 'react'
import Link from 'next/link'
import { OfferValidationResponse } from '../schemas'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { APP_ROUTES } from '@/config/routes'
import {
  BuildingIcon,
  ExternalLinkIcon,
  InfoIcon,
  TrendingUpIcon,
  UserPlusIcon,
} from 'lucide-react'

type Props = {
  result: OfferValidationResponse
}

export const ValidationResultDisplay: React.FC<Props> = ({ result }) => {
  // スコアに基づくカラーとテキストの判定
  const getScoreInfo = (score: number) => {
    if (score >= 4.5)
      return {
        color: 'text-green-600',
        bg: 'bg-green-100',
        label: '極めて高い競争力',
        variant: 'primary' as const,
      }
    if (score >= 3.5)
      return {
        color: 'text-[#FD7601]',
        bg: 'bg-[#FD7601]-10',
        label: '十分な競争力',
        variant: 'teal' as const,
      }
    if (score >= 2.5)
      return {
        color: 'text-yellow-600',
        bg: 'bg-yellow-100',
        label: '平均的',
        variant: 'orange' as const,
      }
    return {
      color: 'text-red-600',
      bg: 'bg-red-100',
      label: '競争力に課題あり',
      variant: 'neutral' as const,
    }
  }

  const scoreInfo = getScoreInfo(result.score)

  return (
    <div className="space-y-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="border-t-4 border-t-indigo-500 shadow-md">
        <div className="pb-3 border-b border-gray-100 mb-4">
          <h3 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <TrendingUpIcon className="h-6 w-6 text-[#FD7601]" />
            AIによるオファー妥当性評価
          </h3>
        </div>
        <div className="space-y-6">
          {/* スコアと評価 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="flex flex-col items-center justify-center bg-white p-4 rounded-full shadow-sm border h-24 w-24 flex-shrink-0">
              <span className={`text-3xl font-bold ${scoreInfo.color}`}>
                {result.score.toFixed(1)}
              </span>
              <span className="text-xs text-gray-500 font-medium">/ 5.0</span>
            </div>
            <div className="space-y-2">
              <Badge variant={scoreInfo.variant as any}>{scoreInfo.label}</Badge>
              <p className="text-gray-700 leading-relaxed text-sm sm:text-base">{result.comment}</p>
            </div>
          </div>

          {/* 総評 */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 font-semibold text-[#FD7601]">
              <InfoIcon className="h-4 w-4 text-[#FD7601]" />
              総評
            </h4>
            <p className="text-gray-600 text-sm">{result.summary}</p>
          </div>

          {/* おすすめ採用サイト */}
          {result.recommendedSites && result.recommendedSites.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <h4 className="flex items-center gap-2 font-semibold text-green-700">
                <BuildingIcon className="h-4 w-4 text-green-500" />
                おすすめの採用サイト
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.recommendedSites.map((site, index) => (
                  <div
                    key={index}
                    className="bg-white border rounded-md p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      {site.url ? (
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-[#FD7601] hover:text-[#FD7601] hover:underline transition-colors"
                        >
                          {site.name}
                        </a>
                      ) : (
                        <span className="font-semibold text-[#FD7601]">{site.name}</span>
                      )}
                      {site.url && (
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-[#FD7601] transition-colors"
                        >
                          <ExternalLinkIcon className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 leading-tight">{site.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 内定後の次ステップ（入社フロー自動連携） */}
          <div className="space-y-2 pt-4 border-t border-gray-100">
            <h4 className="flex items-center gap-2 font-semibold text-[#FD7601]">
              <UserPlusIcon className="h-4 w-4" />
              内定後の次ステップ
            </h4>
            <p className="text-sm text-gray-600">
              オファー条件が妥当と判断できたら、従業員マスタに内定者を登録してください。
              入社予定日（start_date）を設定すると、入社ライフサイクルフローが自動で開始されます。
            </p>
            <Link
              href={APP_ROUTES.TENANT.ADMIN_EMPLOYEES}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FD7601] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              従業員登録へ
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
