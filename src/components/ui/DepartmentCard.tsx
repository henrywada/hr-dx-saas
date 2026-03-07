import React from 'react';
import Link from 'next/link';

interface DepartmentItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface DepartmentCardProps {
  title: string;
  icon: React.ReactNode;
  items: DepartmentItem[];
}

/**
 * 部門カードコンポーネント
 * 
 * 部門名とサブメニューリストを表示するカード
 * 
 * @example
 * ```tsx
 * <DepartmentCard 
 *   title="Human Resources"
 *   icon={<Users className="w-5 h-5" />}
 *   items={[
 *     { label: "View Payslip", href: "/biz/hr/payroll" },
 *     { label: "Training Center", href: "/biz/hr/training" },
 *     { label: "Company Benefits", href: "/biz/hr/benefits" }
 *   ]}
 * />
 * ```
 */
export const DepartmentCard: React.FC<DepartmentCardProps> = ({
  title,
  icon,
  items,
}) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-primary bg-primary-light p-2 rounded-lg">
          {icon}
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index}>
            {item.href ? (
              <Link
                href={item.href}
                className="text-sm text-gray-600 hover:text-primary hover:underline block py-1"
              >
                {item.label}
              </Link>
            ) : (
              <button
                onClick={item.onClick}
                className="text-sm text-gray-600 hover:text-primary hover:underline block py-1 text-left w-full"
              >
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DepartmentCard;
