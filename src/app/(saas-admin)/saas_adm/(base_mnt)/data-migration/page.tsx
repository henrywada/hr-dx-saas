import { getMigrationTenants } from '@/features/data-migration/queries'
import DataMigrationClient from '@/features/data-migration/components/DataMigrationClient'

export const metadata = {
  title: 'データ移行 | HR-DX',
}

export default async function DataMigrationPage() {
  const tenants = await getMigrationTenants()

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 px-4 py-6 sm:px-6">
      <header>
        <h1 className="text-lg font-semibold text-slate-900">他システムデータ移行</h1>
        <p className="mt-1 text-xs text-slate-500">
          移行先テナントを指定し、従業員・健診・ストレスチェックを系統ごとにプレビュー → 実行 →
          結果表示します。健診・ストレスチェックは社員番号で紐付けるため、先に従業員データを取り込んでください。新規従業員は
          CSV の mailadress で一般従業員（employee）としてログイン可能になります（仮パスワード{' '}
          <code>aaaaaa</code>）。
        </p>
      </header>
      <DataMigrationClient tenants={tenants} />
    </div>
  )
}
