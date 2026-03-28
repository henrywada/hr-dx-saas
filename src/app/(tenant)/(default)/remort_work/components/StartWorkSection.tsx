'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  jstDayStartUtcIso,
  jstNextDayStartUtcIso,
  toJSTDateString,
} from '@/lib/datetime'
import StartButton from './StartButton'

type SessionRow = {
  end_at: string | null
  status: string | null
}

function hasOpenSessionToday(rows: SessionRow[]) {
  return rows.some((r) => r.status === 'open' && !r.end_at)
}

/**
 * 本日に進行中のテレワークセッションがあるときは「作業開始」を出さない
 */
export default function StartWorkSection() {
  const [hideStart, setHideStart] = useState<boolean | null>(null)
  const dayYmd = toJSTDateString()

  const load = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setHideStart(false)
      return
    }

    const startIso = jstDayStartUtcIso(dayYmd)
    const endIso = jstNextDayStartUtcIso(dayYmd)

    const { data, error } = await supabase
      .from('telework_sessions')
      .select('end_at, status')
      .eq('user_id', user.id)
      .gte('start_at', startIso)
      .lt('start_at', endIso)

    if (error) {
      setHideStart(false)
      return
    }
    setHideStart(hasOpenSessionToday((data ?? []) as SessionRow[]))
  }, [dayYmd])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onChange = () => void load()
    window.addEventListener('telework:sessions-changed', onChange)
    return () => window.removeEventListener('telework:sessions-changed', onChange)
  }, [load])

  // null: 取得中は出さない（作業中のときのちらつき防止） / true: 作業中で非表示
  if (hideStart !== false) {
    return null
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h2 className="font-bold text-lg text-slate-800">作業開始</h2>
      <StartButton />
    </section>
  )
}
