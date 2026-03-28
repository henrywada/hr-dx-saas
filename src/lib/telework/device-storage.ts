/** 端末登録フォームとテレワーク開始で共有（このブラウザ＝このPC の識別子） */
export const TELEWORK_DEVICE_IDENTIFIER_STORAGE_KEY = 'telework_device_identifier_v1'

/** localStorage に端末識別子を保持（未設定なら生成して保存） */
export function getOrCreateDeviceIdentifier(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(TELEWORK_DEVICE_IDENTIFIER_STORAGE_KEY)
  if (!id) {
    id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(TELEWORK_DEVICE_IDENTIFIER_STORAGE_KEY, id)
  }
  return id
}
