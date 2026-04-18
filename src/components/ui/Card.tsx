import React from 'react'

export type CardVariant = 'default' | 'primary' | 'accent-teal' | 'accent-orange'

interface CardProps {
  variant?: CardVariant
  title?: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
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
  const baseStyles = 'rounded-lg shadow-sm p-6 transition-shadow duration-200'
  const hoverStyles = onClick ? 'cursor-pointer hover:shadow-md' : ''

  const variantStyles = {
    default: 'bg-white border border-gray-200',
    primary: 'bg-primary-light border border-primary/20',
    'accent-teal': 'bg-success-light border border-accent-teal/25',
    'accent-orange': 'bg-warning-light border border-accent-orange/25',
  }

  const titleColorStyles = {
    default: 'text-gray-900',
    primary: 'text-primary',
    'accent-teal': 'text-accent-teal',
    'accent-orange': 'text-accent-orange',
  }

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {title && <h3 className={`${titleColorStyles[variant]} font-bold text-lg mb-4`}>{title}</h3>}
      <div className="text-gray-700">{children}</div>
    </div>
  )
}

export default Card
