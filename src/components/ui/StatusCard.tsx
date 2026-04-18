import React from 'react'

export type StatusCardVariant = 'warning' | 'success' | 'info'

interface StatusCardProps {
  icon: React.ReactNode
  title: string
  value: string | number
  variant?: StatusCardVariant
}

/**
 * ステータスカードコンポーネント
 *
 * アイコン、タイトル、値を表示するステータスカード
 *
 * @example
 * ```tsx
 * <StatusCard
 *   icon={<ClipboardList className="w-6 h-6" />}
 *   title="Pending Tasks"
 *   value="5 Tasks"
 *   variant="warning"
 * />
 * ```
 */
export const StatusCard: React.FC<StatusCardProps> = ({ icon, title, value, variant = 'info' }) => {
  const variantStyles = {
    warning: 'bg-warning-light text-accent-orange border-accent-orange/20',
    success: 'bg-success-light text-success border-success/20',
    info: 'bg-primary-light text-primary border-primary/20',
  }

  const iconBgStyles = {
    warning: 'bg-accent-orange/10',
    success: 'bg-success/10',
    info: 'bg-primary/10',
  }

  return (
    <div className={`${variantStyles[variant]} border rounded-lg p-6 shadow-sm`}>
      <div className="flex items-center gap-4">
        <div className={`${iconBgStyles[variant]} p-3 rounded-lg`}>{icon}</div>
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="font-display text-2xl font-bold mt-1 tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  )
}

export default StatusCard
