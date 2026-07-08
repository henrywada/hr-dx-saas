import { redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import TenantBackLink from '@/components/common/TenantBackLink'
import { getTenantJobPostings, getTenantBrandingInfo } from '@/features/job-postings/queries'
import { BrandingWizard } from '@/features/job-postings/components/BrandingWizard'
import { TenantBrandingInfo } from '@/features/job-postings/types'

export const metadata = {
  title: '採用ブランディング支援 | HR-DX',
}

export default async function JobBrandingPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [jobPostings, brandingInfo] = await Promise.all([
    getTenantJobPostings(),
    getTenantBrandingInfo(),
  ])

  const initialBrandingInfo: TenantBrandingInfo = brandingInfo ?? {
    industry: null,
    founding_year: null,
    recruitment_strengths: null,
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">採用ブランディング支援</h1>
          <p className="mt-1 text-sm text-gray-500">
            AIが求人票を媒体別に最適化し、応募率を高める文章を自動生成します。
          </p>
        </div>
        <TenantBackLink className="self-start shrink-0" />
      </div>

      {jobPostings.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <p className="text-gray-500">求人票がまだ登録されていません。</p>
          <a
            href={APP_ROUTES.TENANT.ADMIN_JOB_BRANDING}
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            求人票を作成する →
          </a>
        </div>
      ) : (
        <BrandingWizard
          jobPostings={jobPostings}
          initialBrandingInfo={initialBrandingInfo}
          companyName={user.tenant_name ?? ''}
        />
      )}
    </div>
  )
}
