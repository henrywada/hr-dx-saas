import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getCourses, getTemplateCourses } from '@/features/e-learning/queries'
import { CourseListClient } from '@/features/e-learning/components/CourseListClient'

export const dynamic = 'force-dynamic'

export default async function ElCoursesPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const [tenantCourses, templateCourses] = await Promise.all([getCourses(), getTemplateCourses()])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">eラーニング コース管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          コースの作成・編集・受講者への割り当てを管理します
        </p>
      </div>
      <CourseListClient tenantCourses={tenantCourses} templateCourses={templateCourses} />
    </div>
  )
}
