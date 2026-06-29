import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { notFound, redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getEvaluationSheet,
  getEvaluationTemplateWithItems,
  getEvaluationGoals,
  getEvaluationScores,
  getEvaluationPeriods,
  getEmployeeNamesByIds,
} from '@/features/evaluation/queries'
import { resolveEvaluationRole } from '@/features/evaluation/types'
import { AdminEvaluationSheetClient } from './AdminEvaluationSheetClient'

export const dynamic = 'force-dynamic'

export default async function AdminEvaluationSheetPage({
  params,
}: {
  params: Promise<{ sheetId: string }>
}) {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const { sheetId } = await params
  const supabase = await createClient()

  const sheet = await getEvaluationSheet(supabase, sheetId)
  if (!sheet || sheet.tenant_id !== user.tenant_id) notFound()

  const [template, goals, scores, periods] = await Promise.all([
    getEvaluationTemplateWithItems(supabase, sheet.template_id),
    getEvaluationGoals(supabase, sheetId),
    getEvaluationScores(supabase, sheetId),
    getEvaluationPeriods(supabase, user.tenant_id!),
  ])

  if (!template) notFound()

  const period = periods.find(p => p.id === sheet.period_id) ?? null

  const nameMap = await getEmployeeNamesByIds(supabase, user.tenant_id!, [
    sheet.employee_id,
    sheet.primary_evaluator_id ?? '',
    sheet.secondary_evaluator_id ?? '',
    sheet.confirmer_id ?? '',
  ])

  const role = resolveEvaluationRole({
    appRole: user.appRole,
    employeeId: user.employee_id,
    sheet,
  })

  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-4 sm:px-6 py-6 mx-auto max-w-[1200px]">
        <AdminEvaluationSheetClient
          sheet={sheet}
          template={template}
          goals={goals}
          scores={scores}
          periodName={period?.name ?? ''}
          employeeName={nameMap[sheet.employee_id] ?? sheet.employee_id}
          primaryName={sheet.primary_evaluator_id ? (nameMap[sheet.primary_evaluator_id] ?? '') : ''}
          secondaryName={
            sheet.secondary_evaluator_id ? (nameMap[sheet.secondary_evaluator_id] ?? '') : ''
          }
          confirmerName={sheet.confirmer_id ? (nameMap[sheet.confirmer_id] ?? '') : ''}
          role={role}
        />
      </div>
    </div>
  )
}
