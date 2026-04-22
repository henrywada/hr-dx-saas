import { getServerUser } from '@/lib/auth/server-user'
import { redirect, notFound } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getCourseWithSlides } from '@/features/e-learning/queries'
import { SlideEditorClient } from '@/features/e-learning/components/SlideEditorClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ElCourseDetailPage({ params }: Props) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const { id } = await params
  const course = await getCourseWithSlides(id)
  if (!course) notFound()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-end">
          <a
            href="/adm/el-courses"
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            ← コース一覧
          </a>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mt-2">{course.title}</h1>
      </div>
      <SlideEditorClient course={course} />
    </div>
  )
}
