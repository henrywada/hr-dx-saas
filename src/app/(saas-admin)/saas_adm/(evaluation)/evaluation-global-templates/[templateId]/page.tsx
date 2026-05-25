import { createClient } from '@/lib/supabase/server'
import { getServerUser } from '@/lib/auth/server-user'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import { getGlobalEvaluationTemplateWithItems } from '@/features/global-evaluation-templates/queries'
import { TEMPLATE_TYPE_LABELS } from '@/features/global-evaluation-templates/types'
import { GlobalEvalTemplateItemsClient } from './GlobalEvalTemplateItemsClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ templateId: string }>
}

export default async function EvaluationGlobalTemplateDetailPage({ params }: Props) {
  const { templateId } = await params

  const user = await getServerUser()
  if (!user || (user.role !== 'supaUser' && user.appRole !== 'developer')) {
    redirect(APP_ROUTES.SAAS.DASHBOARD)
  }

  const supabase = await createClient()
  const template = await getGlobalEvaluationTemplateWithItems(supabase, templateId)
  if (!template) notFound()

  return (
    <div className="min-h-full bg-gray-50">
      <div className="px-6 pb-6 pt-3">
        <div className="mb-3">
          <Link
            href={APP_ROUTES.SAAS.EVAL_GLOBAL_TEMPLATES}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-4 w-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            評価テンプレート一覧に戻る
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="relative border-b border-gray-300 bg-gray-200 px-6 py-5">
            <div className="flex min-w-0 flex-wrap items-start gap-3">
              <div className="min-w-0 pt-0.5">
                <div className="flex items-center gap-2">
                  <h1 className="bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-[1.2rem] font-bold leading-snug tracking-tight text-transparent sm:text-[1.5rem]">
                    {template.name}
                  </h1>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {TEMPLATE_TYPE_LABELS[template.template_type]}
                  </span>
                  {!template.is_active && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                      無効
                    </span>
                  )}
                </div>
                <div
                  className="mt-1.5 h-1 w-12 rounded-full bg-linear-to-r from-primary to-primary/60 sm:w-14"
                  aria-hidden
                />
                {template.description && (
                  <p className="mt-2 text-sm text-gray-600">{template.description}</p>
                )}
              </div>
            </div>
          </header>
          <div className="p-6">
            <GlobalEvalTemplateItemsClient template={template} />
          </div>
        </div>
      </div>
    </div>
  )
}
