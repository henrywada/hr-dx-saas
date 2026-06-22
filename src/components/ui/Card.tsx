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
  const baseStyles =
    'rounded-xl border border-[#e2e6ec] shadow-none p-6 transition-shadow duration-200'
  const hoverStyles = onClick ? 'cursor-pointer hover:shadow-md' : ''

  const variantStyles = {
    default: 'bg-white',
    primary: 'bg-primary-light',
    'accent-teal': 'bg-success-light',
    'accent-orange': 'bg-warning-light',
  }

  const titleColorStyles = {
    default: 'text-sm font-medium text-[#57606a]',
    primary: 'text-sm font-medium text-primary',
    'accent-teal': 'text-sm font-medium text-accent-teal',
    'accent-orange': 'text-sm font-medium text-accent-orange',
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
