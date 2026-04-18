import React from 'react'

interface WelcomeHeaderProps {
  userName: string
  notifications?: string
}

/**
 * ウェルカムヘッダーコンポーネント
 *
 * ユーザー名と通知メッセージを表示する青いグラデーション背景のヘッダー
 *
 * @example
 * ```tsx
 * <WelcomeHeader
 *   userName="Alex"
 *   notifications="You have 5 pending approvals today and a team sync at 2:00 PM. Have a productive day!"
 * />
 * ```
 */
export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ userName, notifications }) => {
  return (
    <div className="bg-linear-to-r from-primary to-primary-dark rounded-lg p-8 text-white shadow-lg">
      <h1 className="font-display text-3xl font-bold mb-2 tracking-tight">
        Good Morning, {userName}
      </h1>
      {notifications && <p className="text-primary-light text-sm">{notifications}</p>}
    </div>
  )
}

export default WelcomeHeader
