import { notFound, redirect } from 'next/navigation'
import { getServerUser } from '@/lib/auth/server-user'
import { getCourseViewerData } from '@/features/e-learning/queries'
import { CourseViewerClient } from '@/features/e-learning/components/CourseViewerClient'

interface Props {
  params: Promise<{ assignmentId: string }>
}

export default async function CourseViewerPage({ params }: Props) {
  const { assignmentId } = await params
  const user = await getServerUser()
  if (!user?.employee_id) redirect('/login')

  const data = await getCourseViewerData(assignmentId, user.employee_id)
  if (!data) notFound()

  return <CourseViewerClient data={data} />
}
