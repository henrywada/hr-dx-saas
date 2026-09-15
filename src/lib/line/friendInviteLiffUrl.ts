export function buildFriendInviteLiffUrl(liffId: string, token: string): string {
  return `https://liff.line.me/${liffId}/friend-link/${encodeURIComponent(token)}`
}
