import React from 'react';

export type StatusCardVariant = 'warning' | 'success' | 'info';

interface StatusCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  variant?: StatusCardVariant;
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
export const StatusCard: React.FC<StatusCardProps> = ({
  icon,
  title,
  value,
  variant = 'info',
}) => {
  const variantStyles = {
    warning: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    success: 'bg-green-50 text-green-600 border-green-200',
    info: 'bg-blue-50 text-blue-600 border-blue-200',
  };

  const iconBgStyles = {
    warning: 'bg-yellow-100',
    success: 'bg-green-100',
    info: 'bg-blue-100',
  };

  return (
    <div className={`${variantStyles[variant]} border rounded-lg p-6 shadow-sm`}>
      <div className="flex items-center gap-4">
        <div className={`${iconBgStyles[variant]} p-3 rounded-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatusCard;
