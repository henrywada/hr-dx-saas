// src/features/team-connect/queries.ts
import { createClient } from '@/lib/supabase/server'
import type { DirectoryEmployee } from './types'

// 組織図表示用の部署・従業員データは src/features/organization/queries.ts のものを
// そのまま再利用する（重複実装しない）。一般従業員向けに必要な検索用データのみここに追加する。
export {
  getDivisions,
  getEmployeesByDivision,
  getUnassignedEmployees,
} from '@/features/organization/queries'

/**
 * 社内ディレクトリ表示用の従業員一覧を取得（一般従業員向け、閲覧専用）
 * email・is_contacted_person等の管理項目は含めない
 */
export async function getDirectoryEmployees(): Promise<DirectoryEmployee[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select(
      `
      id, name, employee_no, job_title, division_id, is_manager, active_status,
      division:division_id(id, name)
    `
    )
    .order('employee_no', { ascending: true })

  if (error) {
    console.error('getDirectoryEmployees error:', error)
    return []
  }
  return (data ?? []) as unknown as DirectoryEmployee[]
}
