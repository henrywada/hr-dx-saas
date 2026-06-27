import { createClient } from '@/lib/supabase/server'
import type {
  ConsultationListItem,
  ConsultationQueueItem,
  ConsultationThread,
} from './types'

/**
 * 匿名相談（is_anonymous=true）の場合、対応者向け表示名を「匿名相談者」に置き換える。
 * データ自体（employee_id）は変更しない。表示層専用の純粋関数。
 */
export function maskAnonymousAuthor<
  T extends { is_anonymous: boolean; employee_name?: string | null },
>(rows: T[]): (T & { display_name: string })[] {
  return rows.map(row => ({
    ...row,
    employee_name: row.is_anonymous ? null : (row.employee_name ?? null),
    display_name: row.is_anonymous ? '匿名相談者' : (row.employee_name ?? '不明'),
  }))
}

export async function getMyConsultations(employeeId: string): Promise<ConsultationListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultations')
    .select('id, category, status, created_at')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getMyConsultations error:', error)
    return []
  }
  return data || []
}

export async function getConsultationThread(
  consultationId: string,
  viewerEmployeeId: string,
  isStaff: boolean
): Promise<ConsultationThread | null> {
  const supabase = await createClient()

  const { data: consultation, error: consultationError } = await supabase
    .from('consultations')
    .select('*')
    .eq('id', consultationId)
    .maybeSingle()

  if (consultationError || !consultation) {
    if (consultationError) console.error('getConsultationThread error:', consultationError)
    return null
  }

  // isStaff は呼び出し元から渡される未検証の値だが、実際のセキュリティ境界は
  // Postgres の RLS ポリシー（テナント分離・行レベルアクセス制御）が担う。
  // ここでの isStaff チェックはこの関数自身のUX上の分岐（早期return）を
  // 制御するのみで、Supabase が実際に返すデータ範囲を左右するものではない。
  if (!isStaff && consultation.employee_id !== viewerEmployeeId) {
    return null
  }

  const { data: replies, error: repliesError } = await supabase
    .from('consultation_replies')
    .select('*')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: true })

  if (repliesError) {
    console.error('getConsultationThread replies error:', repliesError)
    return { consultation, replies: [] }
  }

  return { consultation, replies: replies || [] }
}

export async function getConsultationQueue(): Promise<ConsultationQueueItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultations')
    .select('id, category, status, is_anonymous, created_at, employees:employee_id(name)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getConsultationQueue error:', error)
    return []
  }

  const rows = (data || []).map(row => ({
    id: row.id,
    category: row.category,
    status: row.status,
    is_anonymous: row.is_anonymous,
    created_at: row.created_at,
    employee_name: (row.employees as { name?: string } | null)?.name ?? null,
  }))

  return maskAnonymousAuthor(rows)
}
