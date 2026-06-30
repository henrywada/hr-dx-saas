'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { APP_ROUTES } from '@/config/routes'
import { createScorm12Api } from '../scorm/scorm12-api'
import { saveScormRuntime } from '../scorm-actions'
import { CourseCompletionBanner } from './CourseCompletionBanner'
import type { ScormPlayerData } from '../scorm-queries'

interface Props {
  data: ScormPlayerData
  certificateMeta: { employeeName: string; tenantName: string }
}

export function ScormPlayerClient({ data, certificateMeta }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [showCompletion, setShowCompletion] = useState(false)
  const apiMounted = useRef(false)

  const { assignment, course, package: pkg, runtime } = data
  const isScorm = pkg.package_type === 'scorm_12'
  const isCompleted = assignment.completed_at != null

  const iframeSrc = useMemo(() => {
    if (pkg.package_type === 'xapi_launch') return pkg.launch_path
    const encoded = pkg.launch_path
      .split('/')
      .map(s => encodeURIComponent(s))
      .join('/')
    return `${APP_ROUTES.TENANT.EL_MY_COURSE_VIEWER(assignment.id)}/scorm-content/${encoded}`
  }, [assignment.id, pkg])

  useEffect(() => {
    if (!isScorm || apiMounted.current) return
    apiMounted.current = true

    const initialData: Record<string, string> = {
      'cmi.core.lesson_status': runtime?.lesson_status ?? 'not attempted',
      'cmi.core.score.raw': runtime?.score_raw ?? '',
      'cmi.suspend_data': runtime?.suspend_data ?? '',
      'cmi.core.student_name': certificateMeta.employeeName,
      'cmi.core.student_id': assignment.employee_id,
      'cmi.core.lesson_location': '',
    }

    const api = createScorm12Api({
      initialData,
      onCommit: cmi => {
        startTransition(async () => {
          await saveScormRuntime({ assignmentId: assignment.id, cmiData: cmi })
        })
      },
      onFinish: cmi => {
        startTransition(async () => {
          const result = await saveScormRuntime({
            assignmentId: assignment.id,
            cmiData: cmi,
            finished: true,
          })
          if (result.success && (result.completed || isCompleted)) {
            setShowCompletion(true)
          }
          router.refresh()
        })
      },
    })

    ;(window as unknown as { API?: typeof api }).API = api

    return () => {
      delete (window as unknown as { API?: typeof api }).API
      apiMounted.current = false
    }
  }, [assignment.employee_id, assignment.id, certificateMeta.employeeName, isCompleted, isScorm, router, runtime])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">
            {isScorm ? 'SCORM 1.2' : 'xAPI 外部コンテンツ'}
          </p>
          <h1 className="text-sm font-semibold text-gray-800 truncate">{course.title}</h1>
        </div>
        <Link
          href={APP_ROUTES.TENANT.EL_MY_COURSES}
          className="shrink-0 text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          一覧へ
        </Link>
      </header>

      {message && <p className="px-4 py-2 text-xs bg-blue-50 text-blue-800">{message}</p>}

      <div className="flex-1 relative">
        <iframe
          title={course.title}
          src={iframeSrc}
          className="absolute inset-0 w-full h-full border-0 bg-white"
          allow="fullscreen"
        />
      </div>

      {isCompleted && !showCompletion && (
        <footer className="bg-white border-t px-4 py-3 text-center">
          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowCompletion(true)}
            className="text-xs text-[#FD7601] font-semibold hover:underline"
          >
            修了証を表示
          </button>
        </footer>
      )}

      {showCompletion && (
        <CourseCompletionBanner
          courseTitle={course.title}
          completedAt={assignment.completed_at ?? new Date().toISOString()}
          employeeName={certificateMeta.employeeName}
          tenantName={certificateMeta.tenantName}
          onClose={() => {
            setShowCompletion(false)
            router.push(APP_ROUTES.TENANT.EL_MY_COURSES)
          }}
        />
      )}
    </div>
  )
}
