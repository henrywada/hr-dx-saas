import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'warning' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  children: React.ReactNode
}

/**
 * 統一されたカラーパレットを使用したボタンコンポーネント
 *
 * @example
 * ```tsx
 * <Button variant="primary">送信</Button>
 * <Button variant="secondary">キャンセル</Button>
 * <Button variant="warning">削除</Button>
 * <Button variant="outline">詳細</Button>
 * ```
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    className = '',
    children,
    disabled,
    ...props
  },
  ref
) {
  const baseStyles =
    'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantStyles = {
    primary:
      'bg-primary text-white shadow-sm hover:bg-primary-dark focus-visible:ring-primary/40',
    secondary:
      'bg-accent-teal text-white shadow-sm hover:opacity-90 focus-visible:ring-accent-teal/40',
    warning:
      'bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 focus-visible:ring-red-300',
    outline:
      'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400 hover:text-neutral-900 focus-visible:ring-neutral-300',
    ghost:
      'bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-300',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-2.5 text-base',
  }

  const widthStyle = fullWidth ? 'w-full' : ''

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
})

Button.displayName = 'Button'

export default Button
