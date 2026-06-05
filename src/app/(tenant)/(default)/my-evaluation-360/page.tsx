import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerUser } from '@/lib/auth/server-user'
import { APP_ROUTES } from '@/config/routes'
import { createClient } from '@/lib/supabase/server'
import { getMyPending360Reviews } from '@/features/evaluation/360-queries'

export const metadata = { title: '360度評価 依頼一覧' }

export default async function My360EvaluationPage() {
  const user = await getServerUser()
  if (!user?.tenant_id) redirect(APP_ROUTES.AUTH.LOGIN)

  const supabase = await createClient()
  const { data: emp } = await supabase
    .from('employees')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const items = emp ? await getMyPending360Reviews(supabase as any, emp.id) : []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">360度評価 依頼一覧</h1>
        <p className="text-sm text-slate-500">あなたに依頼された評価フィードバックです</p>
      </div>

      {items.length === 0 && (
        <div className="flex items-center justify-center h-40 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
          現在依頼されている評価はありません
        </div>
      )}

      <div className="space-y-3">
        {items.map(item => {
          const isComplete = item.answered_count >= item.question_count && item.question_count > 0
          return (
            <div
              key={item.reviewer_id}
              className="border border-slate-200 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.campaign_name}</p>
                  <p className="text-sm text-slate-600">
                    評価対象者：<span className="font-medium">{item.subject_name}</span>
                  </p>
                </div>
                {isComplete ? (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full shrink-0">
                    回答済
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full shrink-0">
                    未回答
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  期限: {item.deadline}
                  {item.is_anonymous && ' · 匿名'}
                  {' · '}
                  {item.answered_count}/{item.question_count}問回答済
                </p>
                <Link
                  href={APP_ROUTES.EVALUATION.MY_EVALUATION_360_ANSWER(item.reviewer_id)}
                  className="text-xs px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  {isComplete ? '回答を確認' : '回答する'}
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
