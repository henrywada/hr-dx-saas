import Link from 'next/link'
import { MessageCircleWarning } from 'lucide-react'
import { APP_ROUTES } from '@/config/routes'

type Props = {
  count: number
}

/** 管理ダッシュボード（/adm）ヘッダー用の新着相談バッジ付きリンク */
export function ConsultationPendingAdminButton({ count }: Props) {
  if (count <= 0) return null

  return (
    <Link
      href={APP_ROUTES.TENANT.ADMIN_CONSULTATION_QUEUE}
      className="inline-flex items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 shadow-xs transition-colors hover:bg-rose-100"
    >
      <MessageCircleWarning className="h-4 w-4" />
      新着相談
      <span className="inline-flex items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  )
}
