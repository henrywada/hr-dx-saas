import { getTenantJobPostingById } from '@/features/job-postings/queries'
import { JobPostingEditorUI } from '@/features/job-postings/components/JobPostingEditorUI'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export const metadata = {
  title: '求人票の編集・AI生成 | Smart HR App',
}

export default async function JobPositionEditPage({ params }: PageProps) {
  const { id } = await params
  const job = await getTenantJobPostingById(id)

  if (!job) {
    notFound()
  }

  const supabase = await createClient()
  const user = await getServerUser()
  let hasCompletedOnboarding = false
  if (user?.tenant_id) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('onboarding_completed_at')
      .eq('id', user.tenant_id)
      .single()
    if (tenant && (tenant as { onboarding_completed_at?: string | null }).onboarding_completed_at) {
      hasCompletedOnboarding = true
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 pb-4 border-b">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/adm/job-positions" className="hover:underline">求人票管理</Link>
          <span>/</span>
          <span>編集</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">
          求人票の編集・AI自動生成
        </h1>
        <p className="text-sm text-gray-500 mt-1">現場のメモを元に、AIがSEOに強い魅力的な求人文面を生成します。</p>
      </div>

      <JobPostingEditorUI 
        jobId={job.id} 
        initialTitle={job.title || ''}
        initialDescription={job.description || ''}
        initialMemo={job.raw_memo || ''}
        initialStatus={job.status}
        hasCompletedOnboarding={hasCompletedOnboarding}
      />
    </div>
  )
}
