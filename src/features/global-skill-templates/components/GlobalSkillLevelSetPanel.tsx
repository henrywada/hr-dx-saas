'use client'

import { useCallback, useEffect, useState } from 'react'
import type { GlobalSkillLevelSetWithLevels } from '../types'
import { loadGlobalSkillLevelSetsAction } from '../actions'
import { GlobalSkillLevelSetWorkspace } from './GlobalSkillLevelSetWorkspace'

/** スキル・レベル登録カード本文のワークスペース */
export function GlobalSkillLevelSetPanel() {
  const [sets, setSets] = useState<GlobalSkillLevelSetWithLevels[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await loadGlobalSkillLevelSetsAction()
      setSets(data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return (
    <section>
      {loading && sets.length === 0 ? (
        <p className="text-center text-sm text-gray-500">読み込み中…</p>
      ) : (
        <GlobalSkillLevelSetWorkspace skillLevelSets={sets} onMutationSuccess={reload} />
      )}
    </section>
  )
}
