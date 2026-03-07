import React from 'react';
import Link from 'next/link';

interface QuickAccessCardProps {
  icon: React.ReactNode;
  title: string;
  href?: string;
  onClick?: () => void;
}

/**
 * クイックアクセスカードコンポーネント
 * 
 * よく使う機能への素早いアクセスを提供するカード
 * 
 * @example
 * ```tsx
 * <QuickAccessCard 
 *   icon={<UserCheck className="w-8 h-8" />}
 *   title="Record Attendance"
 *   href="/biz/hr/attendance"
 * />
 * ```
 */
export const QuickAccessCard: React.FC<QuickAccessCardProps> = ({
  icon,
  title,
  href,
  onClick,
}) => {
  const content = (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-primary transition-all duration-200 cursor-pointer group">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="text-primary group-hover:scale-110 transition-transform duration-200">
          {icon}
        </div>
        <p className="font-medium text-gray-900">{title}</p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return <div onClick={onClick}>{content}</div>;
};

export default QuickAccessCard;
