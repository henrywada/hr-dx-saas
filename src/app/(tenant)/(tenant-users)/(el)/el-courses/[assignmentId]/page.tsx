import { notFound, redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { getCourseViewerData } from '@/features/e-learning/queries'
import { canAccessCourseViewer } from '@/features/e-learning/publication-window'
import { CourseViewerClient } from '@/features/e-learning/components/CourseViewerClient'
import { ScormPlayerClient } from '@/features/e-learning/components/ScormPlayerClient'
import { getScormPlayerData } from '@/features/e-learning/scorm-queries'
import type { LearningPreferences } from '@/features/e-learning/types'

const DEFAULT_LEARNING_PREFERENCES: LearningPreferences = {
  audio_enabled: false,
  captions_enabled: true,
}

interface Props {
  params: Promise<{ assignmentId: string }>
}

export default async function CourseViewerPage({ params }: Props) {
  const { assignmentId } = await params
  const user = await getServerUser()
  if (!user?.employee_id) redirect('/login')

  const data = await getCourseViewerData(assignmentId, user.employee_id)
  if (!data) notFound()

  if (!canAccessCourseViewer(data, data.assignment.completed_at ?? null)) {
    redirect('/el-courses')
  }

  const contentFormat = data.content_format ?? 'native'
  const certificateMeta = {
    employeeName: user.name ?? '従業員',
    tenantName: user.tenant_name ?? '会社',
  }

  if (contentFormat === 'scorm_12' || contentFormat === 'xapi_launch') {
    const scormData = await getScormPlayerData(assignmentId, user.employee_id)
    if (!scormData) notFound()
    return <ScormPlayerClient data={scormData} certificateMeta={certificateMeta} />
  }

  return (
    <CourseViewerClient
      data={data}
      certificateMeta={certificateMeta}
      initialPreferences={data.preferences ?? DEFAULT_LEARNING_PREFERENCES}
    />
  )
}
