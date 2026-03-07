'use server'

import { createClient } from '@/lib/supabase/server'

// ログのアクションタイプ定義
export type ActivityAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'VIEW' 
  | 'EXPORT' 
  | 'IMPORT' 
  | 'APPROVE' 
  | 'REJECT'

// ログの対象エンティティ定義
export type ActivityEntity = 
  | 'AUTH' 
  | 'EMPLOYEE' 
  | 'PAYROLL' 
  | 'ATTENDANCE' 
  | 'SYSTEM' 
  | 'TENANT' 
  | 'DEPARTMENT' 
  | 'SETTING'

interface LogActivityParams {
  tenantId: string
  employeeId?: string | null
  action: ActivityAction
  entityType: ActivityEntity
  description?: string
}


/**
 * ユーザーアクティビティログを記録する
 * @param params ログパラメータ
 */
export async function logActivity({
  tenantId,
  employeeId,
  action,
  entityType,
  description
}: LogActivityParams) {

  try {
    const supabase = await createClient()

    const { error } = await supabase.from('system_logs').insert({
      tenant_id: tenantId,
      employee_id: employeeId || null,
      action,
      entity_type: entityType,
      description: description || '',
    })

    if (error) {
      // ログ記録のエラーはメイン処理を中断させないため、コンソール出力に留める
      console.error('[LOGGER] Insert Error:', JSON.stringify(error, null, 2))
    }
  } catch (error) {
    console.error('[LOGGER] Unexpected Error:', error)
  }
}
