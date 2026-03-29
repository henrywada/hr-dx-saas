/**
 * 残業申請 API のクライアントラッパー（Bearer 注入・エラー整形）
 */
import { createClient } from '@/lib/supabase/client'
import type {
  FetchApplicationsQuery,
  OvertimeApplicationsListResponse,
  OvertimeDecisionBody,
  OvertimeDecisionResponse,
  OvertimeRequestCorrectionBody,
} from '../types'

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {}
  const token = process.env.NEXT_PUBLIC_API_TOKEN
  if (token) {
    headers.Authorization = `Bearer ${token}`
    return headers
  }
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }
  return headers
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  if (!text) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('レスポンスの解析に失敗しました')
  }
}

function buildApplicationsQuery(params: FetchApplicationsQuery): string {
  const q = new URLSearchParams()
  q.set('tenant_id', params.tenant_id)
  q.set('month', params.month)
  q.set('page', String(params.page ?? 1))
  q.set('limit', String(params.limit ?? 10))
  for (const s of params.status ?? []) {
    q.append('status', s)
  }
  if (params.all_division_employees) {
    q.set('all_division_employees', '1')
  }
  return q.toString()
}

/** GET /api/overtime/applications — 一覧 */
export async function fetchApplications(
  params: FetchApplicationsQuery,
): Promise<OvertimeApplicationsListResponse> {
  const qs = buildApplicationsQuery(params)
  const res = await fetch(`/api/overtime/applications?${qs}`, {
    method: 'GET',
    headers: {
      ...(await getAuthHeaders()),
    },
    credentials: 'same-origin',
  })
  if (!res.ok) {
    const err = (await parseJson<{ error?: string }>(res).catch(() => ({}))) as {
      error?: string
    }
    throw new Error(err.error ?? `一覧の取得に失敗しました (${res.status})`)
  }
  return parseJson<OvertimeApplicationsListResponse>(res)
}

/** POST /api/overtime/applications/:id/approve */
export async function approveApplication(
  id: string,
  body: OvertimeDecisionBody,
): Promise<OvertimeDecisionResponse> {
  const res = await fetch(`/api/overtime/applications/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await parseJson<{ error?: string }>(res).catch(() => ({}))) as {
      error?: string
    }
    throw new Error(err.error ?? `承認に失敗しました (${res.status})`)
  }
  return parseJson<OvertimeDecisionResponse>(res)
}

/** POST /api/overtime/applications/:id/reject */
export async function rejectApplication(
  id: string,
  body: OvertimeDecisionBody,
): Promise<OvertimeDecisionResponse> {
  const res = await fetch(`/api/overtime/applications/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await parseJson<{ error?: string }>(res).catch(() => ({}))) as {
      error?: string
    }
    throw new Error(err.error ?? `却下に失敗しました (${res.status})`)
  }
  return parseJson<OvertimeDecisionResponse>(res)
}

/** POST /api/overtime/applications/:id/request_correction */
export async function requestCorrection(
  id: string,
  body: OvertimeRequestCorrectionBody,
): Promise<OvertimeDecisionResponse> {
  const res = await fetch(`/api/overtime/applications/${id}/request_correction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeaders()),
    },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await parseJson<{ error?: string }>(res).catch(() => ({}))) as {
      error?: string
    }
    throw new Error(err.error ?? `修正依頼に失敗しました (${res.status})`)
  }
  return parseJson<OvertimeDecisionResponse>(res)
}
