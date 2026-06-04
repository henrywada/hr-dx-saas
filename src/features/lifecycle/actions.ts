'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { APP_ROUTES } from '@/config/routes'

const HR_ROLES = ['hr', 'hr_manager', 'tenant_admin', 'developer']

/** デフォルトタスクテンプレートをシードする（初回セットアップ用・冪等） */
export async function seedDefaultTaskTemplates(): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('lifecycle_task_templates')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .limit(1)

  if (existing && existing.length > 0) return { success: true }

  const defaults = [
    // 入社チェックリスト
    {
      lifecycle_type: 'onboarding',
      title: '雇用契約書の締結',
      description: '雇用契約書を締結し、署名済み書類を保管する',
      sort_order: 0,
    },
    {
      lifecycle_type: 'onboarding',
      title: '社会保険・雇用保険の手続き',
      description: '健康保険・厚生年金・雇用保険の加入手続きを行う',
      sort_order: 1,
    },
    {
      lifecycle_type: 'onboarding',
      title: 'マイナンバーの収集',
      description: '扶養控除等申告書と合わせてマイナンバーを収集する',
      sort_order: 2,
    },
    {
      lifecycle_type: 'onboarding',
      title: 'PCアカウントの作成',
      description: 'Google アカウント・社内システムのアカウントを発行する',
      sort_order: 3,
    },
    {
      lifecycle_type: 'onboarding',
      title: '備品・IDカードの準備',
      description: 'PC・名刺・入館証・備品を準備する',
      sort_order: 4,
    },
    {
      lifecycle_type: 'onboarding',
      title: '入社初日のオリエンテーション実施',
      description: '社内ルール・ツール説明・部署紹介を行う',
      sort_order: 5,
    },
    {
      lifecycle_type: 'onboarding',
      title: '研修スケジュールの割り当て',
      description: '入社研修・e-ラーニングコースをアサインする',
      sort_order: 6,
    },
    {
      lifecycle_type: 'onboarding',
      title: '部署への配属完了確認',
      description: '組織図・Slack チャンネルへの追加を確認する',
      sort_order: 7,
    },
    // 退社チェックリスト
    {
      lifecycle_type: 'offboarding',
      title: '退職意向の確認・退職届受領',
      description: '退職届を受領し、最終出社日を確定する',
      sort_order: 0,
    },
    {
      lifecycle_type: 'offboarding',
      title: '業務引き継ぎスケジュールの作成',
      description: '後任者への引き継ぎ計画と期限を設定する',
      sort_order: 1,
    },
    {
      lifecycle_type: 'offboarding',
      title: '引き継ぎドキュメントの作成',
      description: '業務手順・連絡先・注意事項を文書化する',
      sort_order: 2,
    },
    {
      lifecycle_type: 'offboarding',
      title: 'PCアカウントの削除',
      description: 'Google・Slack・社内システムのアカウントを削除 / 無効化する',
      sort_order: 3,
    },
    {
      lifecycle_type: 'offboarding',
      title: '備品・IDカードの回収',
      description: 'PC・名刺・入館証・貸与備品を回収する',
      sort_order: 4,
    },
    {
      lifecycle_type: 'offboarding',
      title: '健康保険・厚生年金の喪失手続き',
      description: '資格喪失届を提出する（退職日翌日から5日以内）',
      sort_order: 5,
    },
    {
      lifecycle_type: 'offboarding',
      title: '雇用保険の離職票発行',
      description: '離職票を作成し本人に交付する',
      sort_order: 6,
    },
    {
      lifecycle_type: 'offboarding',
      title: '源泉徴収票の発行',
      description: '退職月分の源泉徴収票を作成し本人に交付する',
      sort_order: 7,
    },
  ]

  const { error } = await supabase
    .from('lifecycle_task_templates')
    .insert(defaults.map(d => ({ ...d, tenant_id: user.tenant_id! })))

  if (error) return { success: false, error: error.message }

  // revalidatePath はレンダリング中に呼び出せないため省略（page.tsx から呼ばれるシード関数）
  return { success: true }
}

const createInstanceSchema = z.object({
  employeeId: z.string().uuid(),
  lifecycleType: z.enum(['onboarding', 'offboarding']),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  notes: z.string().max(2000).optional(),
})

/** ライフサイクルインスタンスを作成し、テンプレートからタスクをコピーする */
export async function createLifecycleInstance(input: {
  employeeId: string
  lifecycleType: 'onboarding' | 'offboarding'
  scheduledDate?: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id || !user.employee_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const parsed = createInstanceSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()

  const { data: instance, error: instanceError } = await supabase
    .from('lifecycle_instances')
    .insert({
      tenant_id: user.tenant_id,
      employee_id: parsed.data.employeeId,
      lifecycle_type: parsed.data.lifecycleType,
      scheduled_date: parsed.data.scheduledDate ?? null,
      notes: parsed.data.notes ?? null,
      created_by: user.employee_id,
    })
    .select('id')
    .single()

  if (instanceError || !instance) {
    return { success: false, error: instanceError?.message ?? 'Failed to create instance' }
  }

  // テンプレートからタスクをコピー（担当者のデフォルトは作成者）
  const { data: templates } = await supabase
    .from('lifecycle_task_templates')
    .select('title, description, sort_order')
    .eq('tenant_id', user.tenant_id)
    .eq('lifecycle_type', parsed.data.lifecycleType)
    .eq('is_active', true)
    .order('sort_order')

  if (templates && templates.length > 0) {
    const tasks = templates.map(t => ({
      instance_id: instance.id,
      tenant_id: user.tenant_id!,
      title: t.title,
      description: t.description,
      sort_order: t.sort_order,
      assignee_id: user.employee_id,
    }))

    const { error: tasksError } = await supabase.from('lifecycle_tasks').insert(tasks)
    if (tasksError) return { success: false, error: tasksError.message }
  }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}

/** タスクのステータスを更新する */
export async function updateTaskStatus(
  taskId: string,
  status: 'pending' | 'in_progress' | 'completed'
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('lifecycle_tasks')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', taskId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}

/** タスクの担当者を更新する */
export async function updateTaskAssignee(
  taskId: string,
  assigneeId: string | null
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('lifecycle_tasks')
    .update({ assignee_id: assigneeId })
    .eq('id', taskId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}

/** インスタンスのメモ（引き継ぎドキュメント）を更新する */
export async function updateInstanceNotes(
  instanceId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('lifecycle_instances')
    .update({ notes })
    .eq('id', instanceId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}

/** インスタンスのステータスを更新する */
export async function updateInstanceStatus(
  instanceId: string,
  status: 'in_progress' | 'completed' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('lifecycle_instances')
    .update({
      status,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', instanceId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}

const templateSchema = z.object({
  lifecycleType: z.enum(['onboarding', 'offboarding']),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  sortOrder: z.number().int().min(0).max(999),
})

/** タスクテンプレートを追加する */
export async function addTaskTemplate(input: {
  lifecycleType: 'onboarding' | 'offboarding'
  title: string
  description?: string
  sortOrder?: number
}): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const parsed = templateSchema.safeParse({
    lifecycleType: input.lifecycleType,
    title: input.title,
    description: input.description,
    sortOrder: input.sortOrder ?? 0,
  })
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const supabase = await createClient()

  const { error } = await supabase.from('lifecycle_task_templates').insert({
    tenant_id: user.tenant_id,
    lifecycle_type: parsed.data.lifecycleType,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    sort_order: parsed.data.sortOrder,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}

/** タスクテンプレートを論理削除する */
export async function deleteTaskTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await getServerUser()
  if (!user?.tenant_id) return { success: false, error: 'Unauthorized' }

  if (!HR_ROLES.includes(user.appRole ?? '')) return { success: false, error: 'Permission denied' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('lifecycle_task_templates')
    .update({ is_active: false })
    .eq('id', templateId)
    .eq('tenant_id', user.tenant_id)

  if (error) return { success: false, error: error.message }

  revalidatePath(APP_ROUTES.TENANT.ADMIN_LIFECYCLE)
  return { success: true }
}
