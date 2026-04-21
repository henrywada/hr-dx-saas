import { redirect } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { getMyAssignments } from '@/features/e-learning/queries'
import { MyCourseListClient } from '@/features/e-learning/components/MyCourseListClient'

export default async function MyCoursesPage() {
  const user = await getServerUser()
  if (!user?.employee_id) redirect('/login')

  const assignments = await getMyAssignments(user.employee_id)
  const published = assignments.filter(a => a.course?.status === 'published')

  // コースIDごとのスライド総数を取得
  const courseIds = [...new Set(published.map(a => a.course_id))]
  const totalSlidesMap: Record<string, number> = {}

  if (courseIds.length > 0) {
    const supabase = await createClient()
    const { data: slides } = await supabase
      .from('el_slides')
      .select('course_id')
      .in('course_id', courseIds)

    for (const id of courseIds) {
      totalSlidesMap[id] = (slides ?? []).filter(s => s.course_id === id).length
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-800">マイコース</h1>
      </div>

      <MyCourseListClient assignments={published as any} totalSlidesMap={totalSlidesMap} />
    </div>
  )
}
