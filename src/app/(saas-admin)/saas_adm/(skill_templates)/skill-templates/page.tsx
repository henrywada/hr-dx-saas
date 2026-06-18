import { SkillTemplatesPageClient } from './SkillTemplatesPageClient'

export const dynamic = 'force-dynamic'

export default async function SkillTemplatesPage() {
  return (
    <div className="min-h-full bg-gray-50">
      <div className="w-full">
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
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              </div>
              <div className="min-w-0 pt-0.5">
                <h1 className="bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-[1.35rem] font-bold leading-snug tracking-tight text-transparent sm:text-[1.65rem]">
                  スキル・レベル登録
                </h1>
                <div
                  className="mt-1.5 h-1 w-12 rounded-full bg-linear-to-r from-primary to-primary/60 sm:w-14"
                  aria-hidden
                />
                <p className="mt-2 max-w-3xl text-sm leading-snug text-gray-700">
                  全テナントが参照できる業種カテゴリ・職種・スキル項目・スキルレベルのテンプレートを管理します。
                </p>
              </div>
            </div>
          </header>
          <div className="p-6">
            <SkillTemplatesPageClient />
          </div>
        </div>
      </div>
    </div>
  )
}
