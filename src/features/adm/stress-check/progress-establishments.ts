import type { EstablishmentProgressStat } from './types'

type EstablishmentInput = {
  id: string
  name: string
}

type EmployeeInput = {
  id: string
}

type SubmissionInput = {
  employee_id: string
  status?: string | null
  consent_to_employer?: boolean | null
}

export type BuildEstablishmentProgressStatsInput = {
  establishments: EstablishmentInput[]
  employees: EmployeeInput[]
  submittedEmployeeIds: Set<string>
  submissions: SubmissionInput[]
  employeeEstablishmentMap: Map<string, string | null>
}

export function buildEstablishmentProgressStats({
  establishments,
  employees,
  submittedEmployeeIds,
  submissions,
  employeeEstablishmentMap,
}: BuildEstablishmentProgressStatsInput): EstablishmentProgressStat[] {
  const employeesByEstablishment = new Map<string, EmployeeInput[]>()

  for (const employee of employees) {
    const establishmentId = employeeEstablishmentMap.get(employee.id) ?? 'unassigned'
    if (!employeesByEstablishment.has(establishmentId)) {
      employeesByEstablishment.set(establishmentId, [])
    }
    employeesByEstablishment.get(establishmentId)!.push(employee)
  }

  const stats: EstablishmentProgressStat[] = []

  for (const establishment of establishments) {
    const groupedEmployees = employeesByEstablishment.get(establishment.id) ?? []
    stats.push(buildStat(establishment.id, establishment.name, groupedEmployees, submittedEmployeeIds, submissions))
  }

  const unassignedEmployees = employeesByEstablishment.get('unassigned') ?? []
  if (unassignedEmployees.length > 0) {
    stats.push(
      buildStat('unassigned', '拠点未割当', unassignedEmployees, submittedEmployeeIds, submissions),
    )
  }

  return stats
}

function buildStat(
  id: string,
  name: string,
  employees: EmployeeInput[],
  submittedEmployeeIds: Set<string>,
  submissions: SubmissionInput[],
): EstablishmentProgressStat {
  const employeeIds = new Set(employees.map((employee) => employee.id))
  const submitted = employees.filter((employee) => submittedEmployeeIds.has(employee.id)).length
  const notSubmittedEmployeeIds = employees
    .filter((employee) => !submittedEmployeeIds.has(employee.id))
    .map((employee) => employee.id)
  const inProgress = submissions.filter(
    (submission) =>
      employeeIds.has(submission.employee_id) && submission.consent_to_employer === false,
  ).length

  return {
    id,
    name,
    submitted,
    notSubmitted: notSubmittedEmployeeIds.length,
    inProgress,
    rate: employees.length ? Math.round((submitted / employees.length) * 100) : 0,
    total: employees.length,
  }
}
