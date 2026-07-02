import { resolvePageFilePath } from './route-resolver'

const DYNAMIC_SEGMENT = /^\[[^\]]+\]$/

/**
 * service.route_path を Next.js App Router の <Link href> 用の静的パスに変換する。
 * `[closure_id]` などの動的セグメントは除去し、実在する page.tsx がある親パスへフォールバックする。
 */
export function resolveServiceLinkHref(
  routePath: string | null | undefined,
  appDir?: string
): string {
  if (!routePath?.trim()) return '#'

  let normalized = routePath.trim()
  if (!normalized.startsWith('/')) normalized = `/${normalized}`

  const segments = normalized.split('/').filter(Boolean)
  let staticSegments = segments.filter(segment => !DYNAMIC_SEGMENT.test(segment))

  while (staticSegments.length > 0) {
    const candidate = `/${staticSegments.join('/')}`
    if (resolvePageFilePath(candidate, appDir)) {
      return candidate
    }
    staticSegments = staticSegments.slice(0, -1)
  }

  return '#'
}
