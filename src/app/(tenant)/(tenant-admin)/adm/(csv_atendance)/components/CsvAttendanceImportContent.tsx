'use client'

import { useCallback, useState } from 'react'
import { WorkTimeCsvWizard } from './WorkTimeCsvWizard'
import { WorkTimeRecordsMonthlySection } from './WorkTimeRecordsMonthlySection'

type CsvAttendanceImportContentProps = {
  tenantId: string
}

export function CsvAttendanceImportContent({ tenantId }: CsvAttendanceImportContentProps) {
  const [monthlyRefreshKey, setMonthlyRefreshKey] = useState(0)
  const onRecordsMutated = useCallback(() => {
    setMonthlyRefreshKey((k) => k + 1)
  }, [])

  return (
    <div className="space-y-8">
      <WorkTimeCsvWizard onRecordsMutated={onRecordsMutated} />
      <WorkTimeRecordsMonthlySection tenantId={tenantId} refreshKey={monthlyRefreshKey} />
    </div>
  )
}
