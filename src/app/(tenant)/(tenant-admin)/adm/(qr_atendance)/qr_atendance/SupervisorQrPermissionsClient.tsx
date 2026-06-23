'use client'

import { useState } from 'react'
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
