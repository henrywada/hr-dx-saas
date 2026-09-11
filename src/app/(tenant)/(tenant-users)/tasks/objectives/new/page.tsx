import { createClient } from '@/lib/supabase/server'
import { getManagerEmployees } from '@/features/task-management/queries'
import { ObjectiveCreationFlow } from '@/features/task-management/components/ObjectiveCreationFlow'

export default async function NewObjectivePage() {
  const supabase = await createClient()
  const managers = await getManagerEmployees(supabase)

  return (
    <div className="w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <ObjectiveCreationFlow managers={managers} />
    </div>
  )
}
