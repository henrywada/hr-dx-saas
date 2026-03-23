import { getServerUser } from '@/lib/auth/server-user'
import { redirect, notFound } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import {
  getProgramInstanceLabel,
  getProgramTargetsWithEmployees,
  getEmployeesForTargetSelection,
} from '@/features/program-targets/queries'
import { ProgramTargetDetailClient } from '@/features/program-targets/components/ProgramTargetDetailClient'
import type { ProgramType } from '@/features/program-targets/types'

const VALID_PROGRAM_TYPES: ProgramType[] = ['stress_check', 'pulse_survey']

interface PageProps {
  params: Promise<{ programType: string; instanceId: string }>
}

export default async function ProgramTargetDetailPage({ params }: PageProps) {
  const user = await getServerUser()
  if (!user?.tenant_id) {
    redirect(APP_ROUTES.AUTH.LOGIN)
  }

  const { programType, instanceId } = await params

  if (!VALID_PROGRAM_TYPES.includes(programType as ProgramType)) {
    notFound()
  }

  const [instanceLabel, targets, employeesForSelection] = await Promise.all([
    getProgramInstanceLabel(programType, instanceId),
    getProgramTargetsWithEmployees(programType, instanceId),
    getEmployeesForTargetSelection(user.tenant_id, programType as ProgramType, instanceId),
  ])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <ProgramTargetDetailClient
        programType={programType as ProgramType}
        instanceId={instanceId}
        instanceLabel={instanceLabel}
        targets={targets}
        employeesForSelection={employeesForSelection}
      />
    </div>
  )
}
