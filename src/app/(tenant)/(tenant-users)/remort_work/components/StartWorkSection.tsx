'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  jstDayStartUtcIso,
  jstNextDayStartUtcIso,
  toJSTDateString,
} from '@/lib/datetime'
import StartButton from './StartButton'

/**
 * 本日（JST）にテレワークセッションが 1 件でもあるときは「作業開始」を出さない（1 日 1 行モデル）
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
      .select('id')
      .eq('user_id', user.id)
      .gte('start_at', startIso)
      .lt('start_at', endIso)
      .limit(1)

    if (error) {
      setHideStart(false)
      return
    }
    setHideStart((data?.length ?? 0) > 0)
  }, [dayYmd])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onChange = () => void load()
    window.addEventListener('telework:sessions-changed', onChange)
    return () => window.removeEventListener('telework:sessions-changed', onChange)
  }, [load])

  // null: 取得中は出さない / true: 本日すでにセッションありで非表示
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
