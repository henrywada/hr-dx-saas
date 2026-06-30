import { getServerUser } from '@/lib/auth/server-user'
import { redirect, notFound } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getCourseWithSlides,
  getCourseRequirementMappings,
  getAllSkillRequirements,
} from '@/features/e-learning/queries'
import { getScormPackageForCourse, getXapiStatementsForCourse } from '@/features/e-learning/scorm-queries'
import { ScormPackagePanel } from '@/features/e-learning/components/ScormPackagePanel'
import { XapiStatementsPanel } from '@/features/e-learning/components/XapiStatementsPanel'
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
  const [course, mappings, allRequirements, scormPackage, xapiStatements] = await Promise.all([
    getCourseWithSlides(id),
    getCourseRequirementMappings(id),
    getAllSkillRequirements(),
    getScormPackageForCourse(id),
    getXapiStatementsForCourse(id),
  ])
  if (!course) notFound()

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-end">
          <a href="/adm/el-courses" className="text-sm font-bold text-blue-600 hover:underline">
            ← コース一覧
          </a>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mt-2">{course.title}</h1>
      </div>
      <div className="space-y-6">
        <ScormPackagePanel
          courseId={id}
          contentFormat={course.content_format ?? 'native'}
          packageInfo={scormPackage}
        />
        <XapiStatementsPanel statements={xapiStatements} />
        <CourseRequirementMappingPanel
          courseId={id}
          mappings={mappings}
          allRequirements={allRequirements}
        />
        {(course.content_format ?? 'native') === 'native' && (
          <SlideEditorClient course={course} />
        )}
      </div>
    </div>
  )
}
