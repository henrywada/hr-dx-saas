import { createClient } from '@/lib/supabase/server'
import type {
  Consultation,
  ConsultationListItem,
  ConsultationQueueItem,
  ConsultationReply,
  ConsultationTargetType,
  ConsultationThread,
  EligibleManager,
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

/**
 * 匿名相談を対応者が閲覧する場合、相談者本人の employee_id をクライアントへ送らない。
 * ConsultationThreadView は Client Component のため、props はそのままRSCペイロードに
 * シリアライズされてブラウザに渡る。employee_id 自体を残すと、対応者向けUIが氏名を
 * 表示していなくても、ペイロードから実名を解決できてしまう（表示層マスクだけでは防げない）。
 */
export function sanitizeConsultationForViewer(
  consultation: Consultation,
  isStaff: boolean
): Consultation {
  if (isStaff && consultation.is_anonymous) {
    return { ...consultation, employee_id: null }
  }
  return consultation
}

/** 匿名相談の本人による返信は、対応者向け表示では author_employee_id を伏せる（同上の理由）。 */
export function sanitizeReplyForViewer(
  reply: ConsultationReply,
  isStaff: boolean,
  isAnonymous: boolean
): ConsultationReply {
  if (isStaff && isAnonymous && !reply.is_staff_reply) {
    return { ...reply, author_employee_id: null }
  }
  return reply
}

export async function getConsultationThread(
  consultationId: string,
  viewerEmployeeId: string,
  isStaff: boolean
): Promise<ConsultationThread | null> {
  const supabase = await createClient()

  const { data: consultation, error: consultationError } = await supabase
    .from('consultations')
    .select(
      'id, tenant_id, employee_id, is_anonymous, category, body, status, assigned_to, target_type, target_employee_id, claimed_by, claimed_at, created_at'
    )
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
    .select('id, consultation_id, author_employee_id, is_staff_reply, body, created_at')
    .eq('consultation_id', consultationId)
    .order('created_at', { ascending: true })

  const sanitizedConsultation = sanitizeConsultationForViewer(
    { ...consultation, target_type: consultation.target_type as ConsultationTargetType },
    isStaff
  )

  if (repliesError) {
    console.error('getConsultationThread replies error:', repliesError)
    return { consultation: sanitizedConsultation, replies: [] }
  }

  const sanitizedReplies = (replies || []).map(reply =>
    sanitizeReplyForViewer(reply, isStaff, consultation.is_anonymous)
  )

  return { consultation: sanitizedConsultation, replies: sanitizedReplies }
}

export async function getConsultationQueue(): Promise<ConsultationQueueItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultations')
    .select(
      'id, category, status, is_anonymous, created_at, claimed_by, employees:employee_id(name)'
    )
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
    claimed_by: row.claimed_by,
  }))

  return maskAnonymousAuthor(rows)
}

/**
 * 「上司」宛先選択用に、テナント内で is_manager=true の全従業員を返す。
 * 直属上司に固定しない（匿名性維持のため、相談者が任意の1名を指名できるようにする）。
 * employees_select_same_tenant の既存RLSにより自テナント内のみ取得される。
 */
export async function getEligibleManagers(): Promise<EligibleManager[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('id, name')
    .eq('is_manager', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('getEligibleManagers error:', error)
    return []
  }
  return data || []
}

/**
 * 自分が対応者として未対応（claimed_by IS NULL）の相談件数。
 * トップページの新着通知バッジ用。RLS（consultations_select_target_unclaimed）が
 * 役割・宛先に応じた絞り込みを行うため、対象外の従業員は常に0件になる。
 */
export async function getPendingConsultationCount(): Promise<number> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('consultations')
    .select('id', { count: 'exact', head: true })
    .is('claimed_by', null)

  if (error) {
    console.error('getPendingConsultationCount error:', error)
    return 0
  }
  return count ?? 0
}
