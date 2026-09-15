// src/app/liff/friend-link/[token]/page.tsx
// LINE友だち紐付け LIFF ページ
// 独立ルート（認証ガードなし）。params は Promise のため async で受け取る。
import { LiffFriendLinkView } from './LiffFriendLinkView'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function LiffFriendLinkPage({ params }: PageProps) {
  const { token } = await params
  return <LiffFriendLinkView inviteToken={token} />
}
