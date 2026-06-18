import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect, notFound } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getEvaluationSheet,
  getEvaluationTemplateWithItems,
  getEvaluationGoals,
  getEvaluationScores,
} from '@/features/evaluation/queries'
import { MyEvaluationSheetClient } from './MyEvaluationSheetClient'

export const dynamic = 'force-dynamic'

export default async function MyEvaluationSheetPage({
  params,
}: {
  params: Promise<{ sheetId: string }>
}) {
  const { sheetId } = await params
  const user = await getServerUser()
  if (!user?.employee_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const sheet = await getEvaluationSheet(supabase, sheetId)
  if (!sheet || sheet.employee_id !== user.employee_id) notFound()

  const [template, goals, scores] = await Promise.all([
    getEvaluationTemplateWithItems(supabase, sheet.template_id),
    getEvaluationGoals(supabase, sheetId),
    getEvaluationScores(supabase, sheetId),
  ])

  if (!template) notFound()

  return (
    <div className="min-h-full bg-gray-50">
      <div className="w-full">
        <MyEvaluationSheetClient
          sheet={sheet}
          template={template}
          goals={goals}
          scores={scores}
          employeeId={user.employee_id}
        />
      </div>
    </div>
  )
}
