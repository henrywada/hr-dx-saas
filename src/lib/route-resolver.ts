import fs from 'node:fs'
import path from 'node:path'

/**
 * Next.js のルートグループ（"(xxx)" 形式のディレクトリ）は実URLのセグメントに現れない。
 * page.tsx を発見するたびに非グループセグメントだけを連結して実効URLを計算し、
 * service.route_path と比較することでファイルパスを解決する。
 */
function isRouteGroupSegment(segment: string): boolean {
  return segment.startsWith('(') && segment.endsWith(')')
}

function toEffectiveRoute(segments: string[]): string {
  const visible = segments.filter(s => !isRouteGroupSegment(s))
  return '/' + visible.join('/')
}

function findPageFile(
  dir: string,
  segments: string[],
  targetRoute: string
): string | null {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return null
  }

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.next') continue

    if (entry.isFile() && entry.name === 'page.tsx') {
      if (toEffectiveRoute(segments) === targetRoute) {
        return path.join(dir, entry.name)
      }
      continue
    }

    if (entry.isDirectory()) {
      const found = findPageFile(
        path.join(dir, entry.name),
        [...segments, entry.name],
        targetRoute
      )
      if (found) return found
    }
  }

  return null
}

export function resolvePageFilePath(
  routePath: string,
  appDir: string = path.join(process.cwd(), 'src/app')
): string | null {
  if (!routePath) return null
  // "/" 始まりに正規化（service.route_path は通常 "/" 始まりだが念のため）
  const normalized = routePath.startsWith('/') ? routePath : `/${routePath}`
  return findPageFile(appDir, [], normalized)
}
