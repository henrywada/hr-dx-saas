import React from 'react'

export type BadgeVariant = 'primary' | 'teal' | 'orange' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

/**
 * 統一されたカラーパレットを使用したバッジコンポーネント
 *
 * @example
 * ```tsx
 * <Badge variant="primary">アクティブ</Badge>
 * <Badge variant="teal">処理中</Badge>
 * <Badge variant="orange">要注意</Badge>
 * ```
 */
export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, className = '' }) => {
  const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium'

  const variantStyles = {
    primary: 'bg-primary-light text-primary',
    teal: 'bg-accent-teal/10 text-accent-teal',
    orange: 'bg-accent-orange/10 text-accent-orange',
    neutral: 'bg-surface-subtle text-text-muted',
  }

  return <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>{children}</span>
}

export default Badge
