import { createAdminClient } from '@/lib/supabase/admin'
import { getAllGlobalTemplates, getTemplateDetail } from '@/features/global-skill-templates/queries'

export default async function GlobalSkillTemplatesPage() {
  const supabase = createAdminClient()
  const templates = await getAllGlobalTemplates(supabase)

  const firstTemplate = templates[0]
  const detail = firstTemplate
    ? await getTemplateDetail(supabase, firstTemplate.id)
    : { categories: [], skills: [] }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">グローバルスキルテンプレート管理</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 space-y-2">
          <h2 className="font-semibold">テンプレート</h2>
          {templates.map(t => (
            <div key={t.id} className="border rounded p-3">
              <div className="font-medium">{t.name}</div>
              <div className="text-xs text-gray-500">{t.industry_type}</div>
              <span
                className={`text-xs px-1.5 py-0.5 rounded ${
                  t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {t.is_active ? '公開中' : '非公開'}
              </span>
            </div>
          ))}
        </div>
        <div className="col-span-2">
          {firstTemplate && (
            <>
              <h2 className="font-semibold mb-2">{firstTemplate.name} のスキル項目</h2>
              {detail.categories.map(cat => (
                <div key={cat.id} className="mb-4">
                  <h3 className="font-medium text-sm text-gray-700 mb-1">{cat.name}</h3>
                  <ul className="space-y-1">
                    {detail.skills
                      .filter(s => s.category_id === cat.id)
                      .map(s => (
                        <li
                          key={s.id}
                          className="text-sm text-gray-600 pl-3 border-l-2 border-gray-200"
                        >
                          {s.name}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
