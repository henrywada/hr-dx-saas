'use server'

import { createAdminClient } from '@/lib/supabase/admin'

const TENANT_ID = '421f9b0d-5db0-47b3-8d48-203b9213dc00'

// ダミー従業員
const DUMMY_EMPLOYEES = [
  { id: 'bb000001-0000-0000-0000-000000000001', div: 'a92f9c97-c274-4c00-bd7a-c2581097b803', name: 'saas02' },
  { id: 'bb000001-0000-0000-0000-000000000002', div: 'a92f9c97-c274-4c00-bd7a-c2581097b803', name: 'saas03' },
  { id: 'bb000001-0000-0000-0000-000000000003', div: 'a92f9c97-c274-4c00-bd7a-c2581097b803', name: 'saas04' },
  { id: 'bb000001-0000-0000-0000-000000000004', div: '966c8f68-b823-4c12-a634-b7db08cc0c7c', name: 'saas05-k' },
  { id: 'bb000001-0000-0000-0000-000000000005', div: '1fef60d4-df80-45b9-9da2-86a1d63b544e', name: 'saas06-sal' },
  { id: 'bb000001-0000-0000-0000-000000000006', div: '1fef60d4-df80-45b9-9da2-86a1d63b544e', name: 'saas07-sal' },
]

const OT_DATA: Record<string, number[]> = {
  '28d3ded9-fc50-420a-bfc0-b9b55b32f19a': [20,25,30,35,40,45,50,60,70,80,55,40,10],
  'bb000001-0000-0000-0000-000000000001': [60,70,75,80,85,90,95,90,85,80,75,70,30],
  'bb000001-0000-0000-0000-000000000002': [30,40,50,80,105,90,85,102,95,88,60,45,20],
  'bb000001-0000-0000-0000-000000000003': [10,15,20,25,30,35,40,45,50,30,20,15,5],
  'bb000001-0000-0000-0000-000000000004': [25,30,35,40,45,50,42,38,55,48,35,28,12],
  'bb000001-0000-0000-0000-000000000005': [48,46,47,48,46,49,50,48,47,50,46,48,30],
  'bb000001-0000-0000-0000-000000000006': [12,18,22,28,32,38,42,35,28,20,15,10,5],
}

function getMonths(n = 13): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
  }
  return months
}

export async function seedOvertimeData(): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = createAdminClient()
    const months = getMonths(13)

    // ダミー従業員を登録
    for (const emp of DUMMY_EMPLOYEES) {
      await supabase.from('employees').upsert({
        id: emp.id,
        tenant_id: TENANT_ID,
        division_id: emp.div,
        active_status: 'active',
        name: emp.name,
        is_manager: false,
        app_role_id: '03c94882-88b0-4937-887b-c3733ab21028',
      }, { onConflict: 'id' })
    }

    // 既存テストデータを削除
    const empIds = [
      '28d3ded9-fc50-420a-bfc0-b9b55b32f19a',
      ...DUMMY_EMPLOYEES.map(e => e.id),
    ]
    await supabase
      .from('monthly_employee_overtime')
      .delete()
      .eq('tenant_id', TENANT_ID)
      .in('employee_id', empIds)

    // テストデータを挿入
    const rows = empIds.flatMap((empId, empIdx) =>
      months.map((month, monthIdx) => ({
        tenant_id: TENANT_ID,
        employee_id: empId,
        year_month: month,
        total_overtime_hours: OT_DATA[empId]?.[monthIdx] ?? 0,
        total_work_hours: 160 + (OT_DATA[empId]?.[monthIdx] ?? 0),
      }))
    )

    const { error } = await supabase
      .from('monthly_employee_overtime')
      .insert(rows)

    if (error) throw error

    return { success: true, message: `${rows.length}件のテストデータを挿入しました` }
  } catch (e) {
    return { success: false, message: String(e) }
  }
}
