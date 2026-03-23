'use client'

import { useState } from 'react'
import Link from 'next/link'
import { APP_ROUTES } from '@/config/routes'
import { SqpList } from '../components/SqpList'

type Props = {
  supervisorUserId: string
  tenantId: string
  /** 人事 / 人事マネージャー: テナント内の全権限行を表示・管理 */
  canManageTenantWide: boolean
}

export function SupervisorQrPermissionsClient({
  supervisorUserId,
  tenantId,
  canManageTenantWide,
}: Props) {
  const [listVersion, setListVersion] = useState(0)

  return (
    <div className="space-y-8">
      {canManageTenantWide ? (
        <div className="flex justify-end">
          <Link
            href={APP_ROUTES.TENANT.ADMIN_QR_SQP_CSV_IMPORT}
            className="text-sm font-medium text-accent-orange hover:underline"
          >
            CSV 一括インポート（従業員番号）
          </Link>
        </div>
      ) : null}
      <SqpList
        supervisorUserId={supervisorUserId}
        tenantId={tenantId}
        canManageTenantWide={canManageTenantWide}
        listVersion={listVersion}
        onChanged={() => setListVersion((v) => v + 1)}
      />
    </div>
  )
}
