'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Monitor } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { invokeEdgeWithSession } from '@/lib/supabase/invoke-edge-with-session'
import { getOrCreateDeviceIdentifier } from '@/lib/telework/device-storage'

type Props = {
  defaultEmployeeNo: string | null | undefined
}

export default function DeviceRegistrationForm({ defaultEmployeeNo }: Props) {
  const [deviceIdentifier, setDeviceIdentifier] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [employeeNumber, setEmployeeNumber] = useState(
    defaultEmployeeNo?.trim() ?? '',
  )
  /** このブラウザの端末識別子に対応する DB 行が承認済みか確認中 / 未承認ならフォーム */
  const [approvalCheck, setApprovalCheck] = useState<
    'checking' | 'approved' | 'form'
  >('checking')
  const [approvedMeta, setApprovedMeta] = useState<{
    device_name: string | null
    approved_at: string | null
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [pairingResult, setPairingResult] = useState<{
    device_id: string
    registration_token: string
  } | null>(null)

  useEffect(() => {
    setDeviceIdentifier(getOrCreateDeviceIdentifier())
  }, [])

  useEffect(() => {
    if (!deviceIdentifier) return
    let cancelled = false
    async function checkApproved() {
      setApprovalCheck('checking')
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) {
        if (!cancelled) setApprovalCheck('form')
        return
      }
      const { data, error } = await supabase
        .from('telework_pc_devices')
        .select('approved, device_name, approved_at')
        .eq('user_id', user.id)
        .eq('device_identifier', deviceIdentifier)
        .maybeSingle()

      if (cancelled) return
      if (error || !data) {
        setApprovedMeta(null)
        setApprovalCheck('form')
        return
      }
      if (data.approved === true) {
        setApprovedMeta({
          device_name: data.device_name,
          approved_at: data.approved_at,
        })
        setApprovalCheck('approved')
      } else {
        setApprovedMeta(null)
        setApprovalCheck('form')
      }
    }
    void checkApproved()
    return () => {
      cancelled = true
    }
  }, [deviceIdentifier])

  useEffect(() => {
    if (defaultEmployeeNo?.trim()) {
      setEmployeeNumber(defaultEmployeeNo.trim())
    }
  }, [defaultEmployeeNo])

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setMessage(null)
      setPairingResult(null)

      if (!employeeNumber.trim()) {
        setMessage('従業員番号が未設定です。人事に登録を依頼してください。')
        return
      }
      if (!deviceName.trim()) {
        setMessage('端末の表示名を入力してください。')
        return
      }

      setLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await invokeEdgeWithSession<{
          device_id?: string
          registration_token?: string
          status?: string
          error?: string
        }>(supabase, 'telework-device-register', {
          body: {
            device_identifier: deviceIdentifier,
            device_name: deviceName.trim(),
            employee_number: employeeNumber.trim(),
          },
        })

        if (error) {
          setMessage(error.message)
          return
        }
        if (data && typeof data === 'object' && 'error' in data && data.error) {
          setMessage(String(data.error))
          return
        }
        if (data?.device_id && data.registration_token) {
          setPairingResult({
            device_id: data.device_id,
            registration_token: data.registration_token,
          })
          setMessage(
            '申請を受け付けました。管理者の承認後、登録トークンで端末エージェントが秘密鍵を取得できます。',
          )
          return
        }
        setMessage('登録に失敗しました。')
      } finally {
        setLoading(false)
      }
    },
    [deviceIdentifier, deviceName, employeeNumber],
  )

  if (approvalCheck === 'checking') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center gap-2 text-slate-500 text-sm">
        <Loader2 className="w-5 h-5 animate-spin" />
        端末の状態を確認しています…
      </div>
    )
  }

  if (approvalCheck === 'approved' && approvedMeta) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-emerald-900 font-bold text-lg">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          承認済み
        </div>
        <p className="text-sm text-emerald-900/90">
          このブラウザに紐づく端末は承認済みです。テレワーク打刻の端末認証に利用できます。
        </p>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-xs font-medium text-emerald-800/80">
              端末識別子
            </span>
            <p className="font-mono text-xs break-all text-slate-800 mt-0.5">
              {deviceIdentifier}
            </p>
          </div>
          {approvedMeta.device_name ? (
            <p className="text-slate-800">
              <span className="text-xs font-medium text-emerald-800/80">
                表示名
              </span>
              <br />
              {approvedMeta.device_name}
            </p>
          ) : null}
          {approvedMeta.approved_at ? (
            <p className="text-slate-700 text-xs">
              承認日時:{' '}
              {new Date(approvedMeta.approved_at).toLocaleString('ja-JP')}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
        <Monitor className="w-5 h-5 text-indigo-600" />
        端末登録申請
      </div>
      <p className="text-sm text-slate-600">
        このブラウザ用の端末 ID は自動で付与されます。表示名は分かりやすい名前（例: 田中のノートPC）を入力してください。
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            端末識別子（自動）
          </label>
          <input
            type="text"
            readOnly
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-700"
            value={deviceIdentifier}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            表示名
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm"
              placeholder="例: 田中のノートPC"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              disabled={loading}
            />
          </label>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            従業員番号
            <input
              type="text"
              required
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900 shadow-sm"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              disabled={loading}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          登録を申請する
        </button>
      </form>

      {message && (
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{message}</p>
      )}

      {pairingResult && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm space-y-2">
          <p className="font-semibold text-amber-900">
            端末エージェント用（一度だけメモしてください）
          </p>
          <p className="font-mono text-xs break-all">
            <span className="text-amber-800">device_id: </span>
            {pairingResult.device_id}
          </p>
          <p className="font-mono text-xs break-all">
            <span className="text-amber-800">registration_token: </span>
            {pairingResult.registration_token}
          </p>
        </div>
      )}
    </div>
  )
}
