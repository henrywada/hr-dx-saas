'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import EndForm from './EndForm'

/**
 * 進行中のテレワークセッションがあるときだけ「作業終了」カードを表示する（終了済みの日は非表示）
 */
export default function EndWorkSection() {
  const [show, setShow] = useState<boolean | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setShow(false)
      return
    }
    const { data, error } = await supabase
      .from('telework_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .is('end_at', null)
      .order('start_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      setShow(false)
      return
    }
    setShow(!!data?.id)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onChange = () => void load()
    window.addEventListener('telework:sessions-changed', onChange)
    return () => window.removeEventListener('telework:sessions-changed', onChange)
  }, [load])

  // 取得中は出さない（終了直後のちらつき防止）
  if (show !== true) {
    return null
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h2 className="font-bold text-lg text-slate-800">作業終了</h2>
      <EndForm />
    </section>
  )
}
