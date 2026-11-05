import { randomUUID } from 'node:crypto'

const MAX_EXT_LENGTH = 8

/** 非 ASCII を含む object key は Storage で Invalid key になるため、拡張子だけを英数字で残す */
function safeExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot <= 0 || dot >= filename.length - 1) return ''
  const ext = filename
    .slice(dot + 1)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, MAX_EXT_LENGTH)
  return ext ? `.${ext}` : ''
}

/** `${tenantId}/${uuid}.${ext}` 形式の Storage パスを作る（表示名は DB の original_filename で持つ） */
export function buildStoragePath(tenantId: string, filename: string): string {
  return `${tenantId}/${randomUUID()}${safeExtension(filename)}`
}

/**
 * クライアントから受け取ったパスが自テナントのものか検証する。
 * 他テナントのファイルを自分の資料として登録・取得されないための防御。
 */
export function isTenantOwnedPath(tenantId: string, path: string): boolean {
  if (!path || path.startsWith('/') || path.includes('..')) return false
  const prefix = `${tenantId}/`
  return path.startsWith(prefix) && path.length > prefix.length
}
