'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import { writeAuditLog } from '@/lib/log/actions'
import { APP_ROUTES } from '@/config/routes'
import { upsertDivisionsAndEmployees } from './commit-org'
import { importHealthCheckMigration } from './commit-health'
import { importStressCheckMigration } from './commit-stress'
import { parseMigrationFiles } from './parse-bundle'
import { buildMigrationPreview } from './preview'
import type { MigrationCommitResult, MigrationPreview, MigrationScope } from './types'

const SCOPES: MigrationScope[] = ['employee', 'health', 'stress']

function parseScope(formData: FormData): MigrationScope | null {
  const raw = String(formData.get('scope') ?? '').trim()
  return SCOPES.includes(raw as MigrationScope) ? (raw as MigrationScope) : null
}

function isSaasAdmin(user: { role?: string | null; appRole?: string | null } | null): boolean {
  if (!user) return false
  return user.role === 'supaUser' || user.appRole === 'developer'
}

async function readFile(formData: FormData, key: string): Promise<ArrayBuffer | null> {
  const v = formData.get(key)
  if (!v || typeof v === 'string') return null
  const file = v as File
  if (!file.size) return null
  return file.arrayBuffer()
}

async function parseFromFormData(formData: FormData, scope: MigrationScope) {
  return parseMigrationFiles({
    employee: scope === 'employee' ? await readFile(formData, 'employee') : null,
    kenshin1: scope === 'health' ? await readFile(formData, 'kenshin1') : null,
    kenshin2: scope === 'health' ? await readFile(formData, 'kenshin2') : null,
    monshin: scope === 'health' ? await readFile(formData, 'monshin') : null,
    stress: scope === 'stress' ? await readFile(formData, 'stress') : null,
  })
}

function emptyFileError(scope: MigrationScope): string {
  if (scope === 'employee') return '従業員ファイルを指定してください'
  if (scope === 'health') return '健診ファイルを指定してください'
  return 'ストレスチェックファイルを指定してください'
}

function parseErrorForScope(
  parsed: Awaited<ReturnType<typeof parseFromFormData>>,
  scope: MigrationScope
): string | null {
  if (scope === 'employee') return parsed.employeeParseError
  if (scope === 'health') return parsed.healthParseError
  return parsed.stressParseError
}

function isEmptyForScope(
  parsed: Awaited<ReturnType<typeof parseFromFormData>>,
  scope: MigrationScope
): boolean {
  if (scope === 'employee') return parsed.employeeRows.length === 0
  if (scope === 'health') return parsed.healthPeople.length === 0
  return parsed.stressRows.length === 0
}

export async function previewDataMigration(
  formData: FormData
): Promise<{ ok: boolean; error?: string; preview?: MigrationPreview }> {
  const user = await getServerUser()
  if (!isSaasAdmin(user)) return { ok: false, error: '権限がありません' }

  const tenantId = String(formData.get('tenantId') ?? '').trim()
  if (!tenantId) return { ok: false, error: '移行先テナントを指定してください' }
  const scope = parseScope(formData)
  if (!scope) return { ok: false, error: '取込対象を指定してください' }

  const parsed = await parseFromFormData(formData, scope)
  const parseError = parseErrorForScope(parsed, scope)
  if (parseError) return { ok: false, error: parseError }
  if (isEmptyForScope(parsed, scope)) return { ok: false, error: emptyFileError(scope) }

  const supabase = createAdminClient()
  const [{ data: tenant }, { data: employees, count }] = await Promise.all([
    supabase.from('tenants').select('id, max_employees').eq('id', tenantId).maybeSingle(),
    supabase
      .from('employees')
      .select('id, employee_no, name, sex', { count: 'exact' })
      .eq('tenant_id', tenantId),
  ])
  if (!tenant) return { ok: false, error: 'テナントが見つかりません' }

  const preview = buildMigrationPreview({
    employeeRows: parsed.employeeRows,
    healthPeople: parsed.healthPeople,
    stressRows: parsed.stressRows,
    existingEmployees: employees ?? [],
    maxEmployees: tenant.max_employees,
    existingCount: count ?? (employees ?? []).length,
    scope,
  })
  return { ok: true, preview }
}

export async function commitDataMigration(formData: FormData): Promise<MigrationCommitResult> {
  const empty: MigrationCommitResult = {
    ok: false,
    divisionsCreated: 0,
    employeesCreated: 0,
    employeesUpdated: 0,
    healthImported: 0,
    stressImported: 0,
    skipped: 0,
    errors: [],
  }
  const user = await getServerUser()
  if (!isSaasAdmin(user)) return { ...empty, error: '権限がありません' }

  const tenantId = String(formData.get('tenantId') ?? '').trim()
  if (!tenantId) return { ...empty, error: '移行先テナントを指定してください' }
  const scope = parseScope(formData)
  if (!scope) return { ...empty, error: '取込対象を指定してください' }
  const skipErrors = String(formData.get('skipErrors') ?? '') === '1'

  const parsed = await parseFromFormData(formData, scope)
  const parseError = parseErrorForScope(parsed, scope)
  if (parseError) return { ...empty, error: parseError }
  if (isEmptyForScope(parsed, scope)) return { ...empty, error: emptyFileError(scope) }

  const supabase = createAdminClient()
  const [{ data: tenant }, { data: employees, count }] = await Promise.all([
    supabase.from('tenants').select('id, max_employees').eq('id', tenantId).maybeSingle(),
    supabase
      .from('employees')
      .select('id, employee_no, name, sex', { count: 'exact' })
      .eq('tenant_id', tenantId),
  ])
  if (!tenant) return { ...empty, error: 'テナントが見つかりません' }

  const preview = buildMigrationPreview({
    employeeRows: parsed.employeeRows,
    healthPeople: parsed.healthPeople,
    stressRows: parsed.stressRows,
    existingEmployees: employees ?? [],
    maxEmployees: tenant.max_employees,
    existingCount: count ?? (employees ?? []).length,
    scope,
  })
  if (preview.errorCount > 0 && !skipErrors) {
    return {
      ...empty,
      error: 'プレビューにエラーがあります。内容を確認するか、エラー行をスキップしてください',
    }
  }

  await writeAuditLog({
    action: 'data_migration.commit',
    path: APP_ROUTES.SAAS.DATA_MIGRATION,
    details: { tenantId, skipErrors, scope },
  })

  const errors: string[] = []
  let skipped = 0
  let divisionsCreated = 0
  let employeesCreated = 0
  let employeesUpdated = 0
  let healthImported = 0
  let stressImported = 0

  if (parsed.employeeRows.length > 0) {
    const org = await upsertDivisionsAndEmployees({
      supabase,
      tenantId,
      rows: parsed.employeeRows,
      skipErrors,
    })
    if (!org.ok) return { ...empty, error: org.error }
    divisionsCreated = org.divisionsCreated
    employeesCreated = org.employeesCreated
    employeesUpdated = org.employeesUpdated
    skipped += org.skipped
  }

  if (parsed.healthPeople.length > 0) {
    const health = await importHealthCheckMigration({
      supabase,
      tenantId,
      people: parsed.healthPeople,
      headersByKind: parsed.headersByKind,
      skipErrors,
    })
    if (health.error && health.imported === 0) return { ...empty, error: health.error }
    healthImported = health.imported
    errors.push(...health.errors)
  }

  if (parsed.stressRows.length > 0) {
    const stress = await importStressCheckMigration({
      supabase,
      tenantId,
      rows: parsed.stressRows,
      skipErrors,
    })
    if (stress.error && stress.imported === 0) return { ...empty, error: stress.error }
    stressImported = stress.imported
    errors.push(...stress.errors)
  }

  revalidatePath(APP_ROUTES.SAAS.DATA_MIGRATION)
  revalidatePath(APP_ROUTES.SAAS.TENANTS)
  return {
    ok: true,
    divisionsCreated,
    employeesCreated,
    employeesUpdated,
    healthImported,
    stressImported,
    skipped,
    errors,
  }
}
