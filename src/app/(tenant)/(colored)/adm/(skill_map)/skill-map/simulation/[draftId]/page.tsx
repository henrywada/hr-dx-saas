import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect, notFound } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getSkillMapDraft, getSkillMatrixRows } from '@/features/skill-map/queries'
import { SimulationBoard } from '@/features/skill-map/components/SimulationBoard'

type Props = { params: Promise<{ draftId: string }> }

export default async function SimulationDetailPage({ params }: Props) {
  const { draftId } = await params
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()

  if (draftId === 'new') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newDraft, error: createErr } = await (supabase as any)
      .from('skill_map_drafts')
      .insert({
        tenant_id: user.tenant_id,
        name: '新しいシミュレーション',
        snapshot: {},
        created_by: user.employee_id,
      })
      .select('id')
      .single()
    if (!createErr && newDraft) {
      redirect(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION_DETAIL(newDraft.id))
    }
    redirect(APP_ROUTES.TENANT.ADMIN_SKILL_MAP_SIMULATION)
  }
  const [draft, rows] = await Promise.all([
    getSkillMapDraft(supabase, draftId),
    getSkillMatrixRows(supabase),
  ])
  if (!draft) notFound()

  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name')
    .order('layer', { ascending: true })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">配置シミュレーション編集</h1>
      <SimulationBoard draft={draft} employees={rows} divisions={divisions ?? []} />
    </div>
  )
}
