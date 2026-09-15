'use client'

import { QRCodeSVG } from 'qrcode.react'

/**
 * LINE友だち招待用 QR コードを表示するクライアントコンポーネント。
 * url には buildFriendInviteLiffUrl で生成した LIFF URL を渡す。
 */
export function LineFriendInviteQr({ url }: { url: string }) {
  return <QRCodeSVG value={url} size={320} includeMargin className="mx-auto" />
}
