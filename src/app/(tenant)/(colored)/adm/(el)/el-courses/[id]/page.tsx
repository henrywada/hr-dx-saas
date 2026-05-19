import { getServerUser } from '@/lib/auth/server-user'
import { redirect, notFound } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getCourseWithSlides,
  getCourseRequirementMappings,
  getAllSkillRequirements,
} from '@/features/e-learning/queries'
import { SlideEditorClient } from '@/features/e-learning/components/SlideEditorClient'
import { CourseRequirementMappingPanel } from '@/features/e-learning/components/CourseRequirementMappingPanel'

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
  const [course, mappings, allRequirements] = await Promise.all([
    getCourseWithSlides(id),
    getCourseRequirementMappings(id),
    getAllSkillRequirements(),
  ])
  if (!course) notFound()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-end">
          <a href="/adm/el-courses" className="text-sm font-bold text-blue-600 hover:underline">
            ← コース一覧
          </a>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mt-2">{course.title}</h1>
      </div>
      <div className="space-y-6">
        <CourseRequirementMappingPanel
          courseId={id}
          mappings={mappings}
          allRequirements={allRequirements}
        />
        <SlideEditorClient course={course} />
      </div>
    </div>
  )
}
