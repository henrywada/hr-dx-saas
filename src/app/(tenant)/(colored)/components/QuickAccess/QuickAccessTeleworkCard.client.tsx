'use client'

import { useEffect, useState } from 'react'
import { Laptop } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TELEWORK_DEVICE_IDENTIFIER_STORAGE_KEY } from '@/lib/telework/device-storage'
import { QuickAccessCard } from './QuickAccessCard'

/**
 * 現ログインユーザーかつ localStorage の端末識別子に一致する telework_pc_devices 行があれば表示。
 * （サーバーでは端末識別子を取得できないためクライアントのみで判定）
 */
export function QuickAccessTeleworkCard() {
  const [show, setShow] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const raw =
        typeof window !== 'undefined'
          ? localStorage.getItem(TELEWORK_DEVICE_IDENTIFIER_STORAGE_KEY)
          : null
      const deviceId = raw?.trim() ?? ''
      if (!deviceId) {
        if (!cancelled) setShow(false)
        return
      }

      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user?.id) {
        if (!cancelled) setShow(false)
        return
      }

      const { data, error } = await supabase
        .from('telework_pc_devices')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_identifier', deviceId)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        setShow(false)
        return
      }
      setShow(!!data)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [])

  if (show !== true) {
    return null
  }

  return (
    <QuickAccessCard
      href="/remort_work"
      title="リモートワーク開始・終了の打刻"
      subtitle="作業の開始・終了を記録"
      icon={Laptop}
      iconBoxClass="bg-indigo-100 text-indigo-700"
      titleHoverClass="group-hover:text-indigo-600"
    />
  )
}
