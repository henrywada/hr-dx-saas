import React from 'react';

export type CardVariant = 'default' | 'primary' | 'accent-teal' | 'accent-orange';

interface CardProps {
  variant?: CardVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * 統一されたカラーパレットを使用したカードコンポーネント
 * 
 * @example
 * ```tsx
 * <Card variant="primary" title="重要なお知らせ">
 *   <p>コンテンツ...</p>
 * </Card>
 * ```
 */
export const Card: React.FC<CardProps> = ({
  variant = 'default',
  title,
  children,
  className = '',
  onClick,
}) => {
  const baseStyles = 'bg-white rounded-lg shadow-md p-6 transition-shadow duration-200';
  const hoverStyles = onClick ? 'cursor-pointer hover:shadow-lg' : '';

  const variantStyles = {
    default: 'border border-gray-200',
    primary: 'border-l-4 border-primary',
    'accent-teal': 'border-l-4 border-accent-teal',
    'accent-orange': 'border-l-4 border-accent-orange',
  };

  const titleColorStyles = {
    default: 'text-gray-900',
    primary: 'text-primary',
    'accent-teal': 'text-accent-teal',
    'accent-orange': 'text-accent-orange',
  };

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {title && (
        <h3 className={`${titleColorStyles[variant]} font-bold text-lg mb-4`}>
          {title}
        </h3>
      )}
      <div className="text-gray-700">{children}</div>
    </div>
  );
};

export default Card;
