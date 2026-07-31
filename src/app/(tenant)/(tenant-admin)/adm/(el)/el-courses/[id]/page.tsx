import { getServerUser } from '@/lib/auth/server-user'
import { redirect, notFound } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getCourseWithSlides,
  getCourseRequirementMappings,
  getAllSkillRequirements,
} from '@/features/e-learning/queries'
import {
  getScormPackageForCourse,
  getXapiStatementsForCourse,
} from '@/features/e-learning/scorm-queries'
import { ElCourseDetailTabs } from '@/features/e-learning/components/ElCourseDetailTabs'

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
    <div className="w-full">
      <div className="mb-6">
        <div className="flex justify-end">
          <a href="/adm/el-courses" className="text-sm font-bold text-blue-600 hover:underline">
            ← コース一覧
          </a>
        </div>
        <h1 className="text-xl font-bold text-gray-800 mt-2">{course.title}</h1>
      </div>
      <ElCourseDetailTabs
        course={course}
        mappings={mappings}
        allRequirements={allRequirements}
        scormPackage={scormPackage}
        xapiStatements={xapiStatements}
      />
    </div>
  )
}
