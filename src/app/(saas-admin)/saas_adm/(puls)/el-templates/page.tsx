import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getTemplateCourses } from '@/features/e-learning/queries'
import { TemplateCourseListClient } from '@/features/e-learning/components/TemplateCourseListClient'

export const dynamic = 'force-dynamic'

export default async function ElTemplatesPage() {
  const user = await getServerUser()
  if (!user || user.appRole !== 'developer') {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const courses = await getTemplateCourses()

  return (
    <main className="flex-1 w-full min-h-screen bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">eラーニング テンプレート管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            テナントが利用できるテンプレートコースを管理します
          </p>
        </div>
        <TemplateCourseListClient courses={courses} />
      </div>
    </main>
  )
}
