import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server-user'
import { createClient } from '@/lib/supabase/server'
import { createAdminServiceClient } from '@/lib/supabase/adminClient'
import { EL_SCORM_PACKAGES_BUCKET } from '@/features/e-learning/constants'
import { getScormPackageForCourse } from '@/features/e-learning/scorm-queries'

function guessContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  switch (ext) {
    case 'html':
    case 'htm':
      return 'text/html; charset=utf-8'
    case 'js':
      return 'application/javascript; charset=utf-8'
    case 'css':
      return 'text/css; charset=utf-8'
    case 'json':
      return 'application/json; charset=utf-8'
    case 'xml':
      return 'application/xml; charset=utf-8'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    case 'woff':
      return 'font/woff'
    case 'woff2':
      return 'font/woff2'
    default:
      return 'application/octet-stream'
  }
}

interface RouteContext {
  params: Promise<{ assignmentId: string; path?: string[] }>
}

/** SCORM パッケージ静的ファイルを同一オリジンで配信（API ブリッジ用） */
export async function GET(_req: Request, context: RouteContext) {
  const { assignmentId, path } = await context.params
  const user = await getServerUser()
  if (!user?.employee_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: assignment } = await supabase
    .from('el_assignments')
    .select('course_id, employee_id')
    .eq('id', assignmentId)
    .eq('employee_id', user.employee_id)
    .maybeSingle()

  if (!assignment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const pkg = await getScormPackageForCourse(assignment.course_id)
  if (!pkg || pkg.package_type !== 'scorm_12' || !pkg.storage_prefix) {
    return NextResponse.json({ error: 'No SCORM package' }, { status: 404 })
  }

  const relPath = (path && path.length > 0 ? path.join('/') : pkg.launch_path).replace(/\\/g, '/')
  if (relPath.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const storagePath = `${pkg.storage_prefix}/${relPath}`
  const admin = createAdminServiceClient()
  const { data, error } = await admin.storage.from(EL_SCORM_PACKAGES_BUCKET).download(storagePath)

  if (error || !data) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const buf = Buffer.from(await data.arrayBuffer())
  return new NextResponse(buf, {
    headers: {
      'Content-Type': guessContentType(relPath),
      'Cache-Control': 'private, max-age=60',
    },
  })
}
