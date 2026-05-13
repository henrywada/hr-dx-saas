import type { EmployeeQualification } from '../types'
import { getQualificationStatus } from '../types'

type Props = { eq: EmployeeQualification }

const STATUS_STYLES = {
  valid: 'bg-green-100 text-green-700 border-green-200',
  expiring_soon: 'bg-orange-100 text-orange-700 border-orange-200',
  expired: 'bg-red-100 text-red-700 border-red-200',
}
const STATUS_ICONS = { valid: '✓', expiring_soon: '⚠', expired: '✕' }

export function QualificationBadge({ eq }: Props) {
  const status = getQualificationStatus(eq.expiry_date)
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${STATUS_STYLES[status]}`}
      title={eq.expiry_date ? `有効期限: ${eq.expiry_date}` : '無期限'}
    >
      <span>{STATUS_ICONS[status]}</span>
      {eq.qualification?.name ?? '不明'}
      {eq.expiry_date && status === 'expiring_soon' && (
        <span className="ml-1 opacity-75">({eq.expiry_date}まで)</span>
      )}
    </span>
  )
}
