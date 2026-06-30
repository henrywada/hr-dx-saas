/** SCORM 1.2 RTE API（window.API）の最小実装 */

export type ScormCmiData = Record<string, string>

export interface Scorm12ApiOptions {
  initialData: ScormCmiData
  onCommit: (data: ScormCmiData) => void
  onFinish: (data: ScormCmiData) => void
}

const READ_ONLY_AFTER_INIT = new Set(['cmi.core.student_id', 'cmi.core.student_name'])

export function createScorm12Api(opts: Scorm12ApiOptions) {
  let initialized = false
  let terminated = false
  const cmi: ScormCmiData = { ...opts.initialData }

  const api = {
    LMSInitialize: () => {
      if (initialized || terminated) return 'false'
      initialized = true
      return 'true'
    },
    LMSFinish: () => {
      if (!initialized || terminated) return 'false'
      terminated = true
      opts.onFinish({ ...cmi })
      return 'true'
    },
    LMSGetValue: (element: string) => {
      if (!initialized || terminated) return ''
      return cmi[element] ?? ''
    },
    LMSSetValue: (element: string, value: string) => {
      if (!initialized || terminated) return 'false'
      if (READ_ONLY_AFTER_INIT.has(element)) return 'false'
      cmi[element] = value
      return 'true'
    },
    LMSCommit: () => {
      if (!initialized || terminated) return 'false'
      opts.onCommit({ ...cmi })
      return 'true'
    },
    LMSGetLastError: () => '0',
    LMSGetErrorString: () => 'No error',
    LMSGetDiagnostic: () => '',
  }

  return api
}

export function isScormLessonComplete(lessonStatus: string | undefined): boolean {
  const s = (lessonStatus ?? '').toLowerCase()
  return s === 'completed' || s === 'passed'
}
