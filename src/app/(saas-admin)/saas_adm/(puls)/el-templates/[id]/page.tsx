import { getServerUser } from '@/lib/auth/server-user'
import { redirect, notFound } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getCourseWithSlides } from '@/features/e-learning/queries'
import { SlideEditorClient } from '@/features/e-learning/components/SlideEditorClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ElTemplateDetailPage({ params }: Props) {
  const user = await getServerUser()
  if (!user || user.appRole !== 'developer') {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const { id } = await params
  const course = await getCourseWithSlides(id)
  if (!course) notFound()

  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <div className="mb-6">
          <div className="flex justify-end">
            <a
              href="/saas_adm/el-templates"
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              ← テンプレート一覧
            </a>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mt-2">{course.title}</h1>
        </div>
        <SlideEditorClient course={course} />
      </div>
    </main>
  )
}
