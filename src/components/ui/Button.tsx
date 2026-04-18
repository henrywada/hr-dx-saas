import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'warning' | 'outline'
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
    'font-medium rounded-lg transition-all duration-200 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'

  const variantStyles = {
    primary: 'bg-primary hover:bg-primary-dark text-white focus:ring-primary',
    secondary: 'bg-accent-teal hover:opacity-90 text-white focus:ring-accent-teal',
    warning: 'bg-accent-orange hover:opacity-90 text-white focus:ring-accent-orange',
    outline: 'border-2 border-primary text-primary hover:bg-primary-light focus:ring-primary',
  }

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
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
