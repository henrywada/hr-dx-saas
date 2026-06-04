interface Props {
  latestPulseScore: number | null
  latestPulsePeriod: string | null
  latestHighStressRate: number | null
  latestQuestionnaireResponseRate: number | null
}

interface ScoreCardProps {
  label: string
  value: string
  sub: string
  colorClass: string
  hasData: boolean
}

function ScoreCard({ label, value, sub, colorClass, hasData }: ScoreCardProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <span className={`text-3xl font-bold ${colorClass}`}>
        {hasData ? value : '—'}
      </span>
      <span className="mt-1 text-sm font-medium text-gray-700">{label}</span>
      <span className="mt-0.5 text-xs text-gray-400">{hasData ? sub : 'データなし'}</span>
    </div>
  )
}

export function EngagementScoreCards({
  latestPulseScore,
  latestPulsePeriod,
  latestHighStressRate,
  latestQuestionnaireResponseRate,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <ScoreCard
        label="パルスサーベイ"
        value={latestPulseScore !== null ? latestPulseScore.toFixed(1) : '—'}
        sub={latestPulsePeriod ?? ''}
        colorClass="text-indigo-600"
        hasData={latestPulseScore !== null}
      />
      <ScoreCard
        label="高ストレス率"
        value={latestHighStressRate !== null ? `${latestHighStressRate}%` : '—'}
        sub="最新ストレスチェック期"
        colorClass={
          latestHighStressRate !== null && latestHighStressRate >= 20
            ? 'text-red-600'
            : 'text-emerald-600'
        }
        hasData={latestHighStressRate !== null}
      />
      <ScoreCard
        label="アンケート回答率"
        value={latestQuestionnaireResponseRate !== null ? `${latestQuestionnaireResponseRate}%` : '—'}
        sub="最新アンケート期"
        colorClass={
          latestQuestionnaireResponseRate !== null && latestQuestionnaireResponseRate < 50
            ? 'text-red-600'
            : 'text-emerald-600'
        }
        hasData={latestQuestionnaireResponseRate !== null}
      />
    </div>
  )
}
