import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getGlobalTemplates } from '@/features/skill-map/queries'
import { SetupWizard } from '@/features/skill-map/components/SetupWizard'

export default async function SkillMapSetupPage() {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const templates = await getGlobalTemplates(supabase)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">スキルマップ初期設定</h1>
      <SetupWizard templates={templates} />
    </div>
  )
}
