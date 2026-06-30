'use server'

import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { revalidatePath } from 'next/cache'
import { APP_ROUTES } from '@/config/routes'
import {
  createKudosSchema,
  toggleReactionSchema,
  valueTagSchema,
  type CreateKudosInput,
  type ToggleReactionInput,
  type ValueTagInput,
} from './types'
import { VALUE_TAGS } from './labels'
import { createAnnouncement } from '@/features/dashboard/actions'

/** Kudos投稿（宛先1名以上、本文、任意でバリュータグ） */
export async function createKudos(input: CreateKudosInput): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const parsed = createKudosSchema.parse(input)
  const supabase = await createClient()

  const { data: kudos, error } = await supabase
    .from('kudos')
    .insert({
      tenant_id: user.tenant_id,
      sender_employee_id: user.employee_id,
      message: parsed.message,
      value_tag: parsed.valueTag ?? null,
    })
    .select('id')
    .single()

  if (error) throw error

  const { error: recipientsError } = await supabase.from('kudos_recipients').insert(
    parsed.recipientEmployeeIds.map(employeeId => ({
      kudos_id: kudos.id,
      employee_id: employeeId,
    }))
  )

  if (recipientsError) throw recipientsError

  // K-S2: 受信者へ個人宛お知らせを発行（/top のお知らせ欄に表示）
  const senderName = user.name ?? '同僚'
  const valueTagSuffix = parsed.valueTag ? `（${parsed.valueTag}）` : ''
  const bodyPreview =
    parsed.message.length > 120 ? `${parsed.message.slice(0, 120)}…` : parsed.message

  await Promise.all(
    parsed.recipientEmployeeIds.map(recipientId =>
      createAnnouncement({
        title: `💛 ${senderName}さんから感謝・称賛が届きました${valueTagSuffix}`,
        body: `${bodyPreview}\n\n詳細は「感謝・称賛」画面でご確認ください。`,
        target_audience: 'あなた宛',
        recipient_employee_id: recipientId,
        is_new: true,
        sort_order: 10,
      })
    )
  )

  revalidatePath(APP_ROUTES.TENANT.KUDOS)
  revalidatePath(APP_ROUTES.TENANT.PORTAL)
}

/** リアクションのトグル（1種類のスタンプ、自分の分のみ追加・削除） */
export async function toggleReaction(input: ToggleReactionInput): Promise<void> {
  const user = await getServerUser()
  if (!user?.employee_id) throw new Error('Unauthorized')

  const parsed = toggleReactionSchema.parse(input)
  const supabase = await createClient()

  const { data: existing, error: selectError } = await supabase
    .from('kudos_reactions')
    .select('kudos_id')
    .eq('kudos_id', parsed.kudosId)
    .eq('employee_id', user.employee_id)
    .maybeSingle()

  if (selectError) throw selectError

  if (existing) {
    const { error } = await supabase
      .from('kudos_reactions')
      .delete()
      .eq('kudos_id', parsed.kudosId)
      .eq('employee_id', user.employee_id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('kudos_reactions')
      .insert({ kudos_id: parsed.kudosId, employee_id: user.employee_id })
    if (error) throw error
  }

  revalidatePath(APP_ROUTES.TENANT.KUDOS)
}

const HR_ROLES = ['hr', 'hr_manager', 'developer']

function assertHrRole(appRole: string | null | undefined): void {
  if (!appRole || !HR_ROLES.includes(appRole)) {
    throw new Error('Unauthorized')
  }
}

/** デフォルトバリュータグをシードする（冪等） */
export async function seedDefaultValueTags(): Promise<void> {
  const user = await getServerUser()
  if (!user?.tenant_id) throw new Error('Unauthorized')
  assertHrRole(user.appRole)

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('kudos_value_tags')
    .select('id')
    .eq('tenant_id', user.tenant_id)
    .limit(1)

  if (existing && existing.length > 0) return

  const { error } = await supabase.from('kudos_value_tags').insert(
    VALUE_TAGS.map((name, index) => ({
      tenant_id: user.tenant_id,
      name,
      sort_order: index,
    }))
  )

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.KUDOS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_KUDOS_STATS)
}

/** バリュータグを追加する */
export async function addValueTag(input: ValueTagInput): Promise<void> {
  const user = await getServerUser()
  if (!user?.tenant_id) throw new Error('Unauthorized')
  assertHrRole(user.appRole)

  const parsed = valueTagSchema.parse(input)
  const supabase = await createClient()

  const { error } = await supabase.from('kudos_value_tags').insert({
    tenant_id: user.tenant_id,
    name: parsed.name,
    sort_order: parsed.sortOrder ?? 0,
  })

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.KUDOS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_KUDOS_STATS)
}

/** バリュータグを無効化する（論理削除） */
export async function deactivateValueTag(id: string): Promise<void> {
  const user = await getServerUser()
  if (!user?.tenant_id) throw new Error('Unauthorized')
  assertHrRole(user.appRole)

  const supabase = await createClient()
  const { error } = await supabase
    .from('kudos_value_tags')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', user.tenant_id)

  if (error) throw error

  revalidatePath(APP_ROUTES.TENANT.KUDOS)
  revalidatePath(APP_ROUTES.TENANT.ADMIN_KUDOS_STATS)
}
