import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import TenantBackLink from '@/components/common/TenantBackLink'
import { BulkDoctorJudgmentButton } from '@/features/health-check/components/BulkDoctorJudgmentButton'
import { getCampaigns, getDoctorQueue } from '@/features/health-check/queries'
import {
  EMPLOYMENT_JUDGMENT_LABEL,
  MEDICAL_ROLES,
  type EmploymentJudgment,
} from '@/features/health-check/types'

export const metadata = { title: '健康診断結果参照' }

type QueueRow = {
  id: string
  employee_name: string
  division_name: string | null
  exam_date: string
  overall_standard_code: string | null
  doctor_judgment_code: string | null
  employment_judgment: EmploymentJudgment
}

function DoctorQueueTable({ title, rows }: { title: string; rows: QueueRow[] }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-x-auto">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3">
        <h2 className="text-xs font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-600">
          合計 <span className="font-semibold tabular-nums text-slate-900">{rows.length}</span>件
        </p>
      </div>
      <table className="w-full text-xs border-collapse mt-2">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-1 px-4">氏名</th>
            <th className="text-left py-1 px-4">部署</th>
            <th className="text-left py-1 px-4">受診日</th>
            <th className="text-left py-1 px-4">標準総合判定</th>
            <th className="text-left py-1 px-4">産業医判定</th>
            <th className="text-left py-1 px-4">就業判定</th>
            <th className="py-1 px-4" />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b border-slate-100 hover:bg-[#f6f8fa]">
              <td className="py-1 px-4">{r.employee_name}</td>
              <td className="py-1 px-4">{r.division_name ?? '—'}</td>
              <td className="py-1 px-4">{r.exam_date}</td>
              <td className="py-1 px-4">{r.overall_standard_code ?? '—'}</td>
              <td className="py-1 px-4">{r.doctor_judgment_code ?? '—'}</td>
              <td className="py-1 px-4">{EMPLOYMENT_JUDGMENT_LABEL[r.employment_judgment]}</td>
              <td className="py-1 px-4">
                <Link
                  href={APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_REVIEW_DETAIL(r.id)}
                  className="font-semibold text-(--brand) hover:underline"
                >
                  開く
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="px-4 py-6 text-xs text-slate-400">該当者はいません</p>}
    </div>
  )
}

export default async function HealthCheckReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string }>
}) {
  const user = await getServerUser()
  if (!user?.tenant_id || !MEDICAL_ROLES.includes(user.appRole as (typeof MEDICAL_ROLES)[number])) {
    redirect(APP_ROUTES.TENANT.ADMIN)
  }

  const { campaignId } = await searchParams
  const campaigns = await getCampaigns()
  const selected = campaigns.find(c => c.id === campaignId) ?? campaigns[0] ?? null
  const rows = await getDoctorQueue(selected?.id)
  const pending = rows.filter(r => !r.doctor_judgment_code)
  const judged = rows.filter(r => Boolean(r.doctor_judgment_code))
  const candidates = pending
    .filter(r => r.overall_standard_code)
    .map(r => ({
      employee_name: r.employee_name,
      overall_standard_code: r.overall_standard_code as string,
    }))

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 mx-auto w-full max-w-[1920px] space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-sm font-semibold text-slate-900">健康診断結果参照</h1>
        <TenantBackLink className="self-start shrink-0" />
      </div>
      {campaigns.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {campaigns.map(c => (
            <Link
              key={c.id}
              href={`${APP_ROUTES.TENANT.ADMIN_HEALTH_CHECK_REVIEW}?campaignId=${c.id}`}
              className={`px-2.5 py-1.5 text-xs rounded-lg border ${
                selected?.id === c.id
                  ? 'border-orange-300 bg-orange-50 text-orange-800'
                  : 'border-slate-300 text-slate-700'
              }`}
            >
              {c.fiscal_year}年度 第{c.round}回
            </Link>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-slate-500">標準値は詳細で確認します。</p>
        {user.appRole === 'company_doctor' && (
          <BulkDoctorJudgmentButton campaignId={selected?.id ?? null} candidates={candidates} />
        )}
      </div>
      <DoctorQueueTable title="産業医 未判定" rows={pending} />
      <DoctorQueueTable title="産業医 判定済" rows={judged} />
    </div>
  )
}
