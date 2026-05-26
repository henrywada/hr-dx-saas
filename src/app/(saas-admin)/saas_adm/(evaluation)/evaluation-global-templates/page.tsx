import { createAdminClient } from '@/lib/supabase/admin'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { getGlobalEvaluationTemplates } from '@/features/global-evaluation-templates/queries'
import { GlobalEvalTemplatesClient } from './GlobalEvalTemplatesClient'

export const dynamic = 'force-dynamic'

export default async function EvaluationGlobalTemplatesPage() {
  const user = await getServerUser()
  if (!user || (user.role !== 'supaUser' && user.appRole !== 'developer')) {
    redirect(APP_ROUTES.SAAS.DASHBOARD)
  }

  const supabase = createAdminClient()
  const templates = await getGlobalEvaluationTemplates(supabase)

  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-6 pb-6 pt-3">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="relative border-b border-gray-300 bg-gray-200 px-6 py-5">
            <div className="flex min-w-0 flex-wrap items-start gap-3">
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
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                  />
                </svg>
              </div>
              <div className="min-w-0 pt-0.5">
                <h1 className="bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-[1.35rem] font-bold leading-snug tracking-tight text-transparent sm:text-[1.65rem]">
                  評価テンプレート管理（グローバル）
                </h1>
                <div
                  className="mt-1.5 h-1 w-12 rounded-full bg-linear-to-r from-primary to-primary/60 sm:w-14"
                  aria-hidden
                />
                <p className="mt-2 max-w-3xl text-sm leading-snug text-gray-700">
                  全テナントが参照できるグローバル評価テンプレートを管理します。テナント管理者はここからコピーしてカスタマイズします。
                </p>
              </div>
            </div>
          </header>
          <div className="p-6">
            <GlobalEvalTemplatesClient initialTemplates={templates} />
          </div>
        </div>
      </div>
    </div>
  )
}
