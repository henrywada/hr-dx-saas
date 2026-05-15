import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getTenantSkills } from '@/features/skill-map/queries'
import {
  getGlobalJobCategories,
  getGlobalJobRoles,
} from '@/features/global-skill-templates/queries'
import { TenantSkillManager } from '@/features/skill-map/components/TenantSkillManager'

export default async function SkillTempCopyPage() {
  const user = await getServerUser()
  if (!user) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()

  const [skills, templateCategories, templateRoles] = await Promise.all([
    getTenantSkills(supabase),
    getGlobalJobCategories(supabase),
    getGlobalJobRoles(supabase),
  ])

  return (
    <div className="min-h-full">
      <div className="px-6 pb-6 pt-3">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-gray-300 bg-gray-200 px-6 py-5">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/95 text-primary shadow-sm ring-1 ring-gray-300/70"
                aria-hidden
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75A2.25 2.25 0 0 1 15.75 13.5H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25A2.25 2.25 0 0 1 13.5 8.25V6ZM6 13.5A2.25 2.25 0 0 1 3.75 15.75V18A2.25 2.25 0 0 1 6 20.25h2.25A2.25 2.25 0 0 1 10.5 18v-2.25A2.25 2.25 0 0 1 8.25 13.5H6Z"
                  />
                </svg>
              </div>
              <div className="min-w-0 pt-0.5">
                <h1 className="bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-[1.35rem] font-bold leading-snug tracking-tight text-transparent sm:text-[1.65rem]">
                  技能マスタ管理
                </h1>
                <div
                  className="mt-1.5 h-1 w-12 rounded-full bg-linear-to-r from-primary to-primary/60 sm:w-14"
                  aria-hidden
                />
              </div>
            </div>
          </div>
          <div className="p-6">
            <TenantSkillManager
              skills={skills}
              templateCategories={templateCategories}
              templateRoles={templateRoles}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
