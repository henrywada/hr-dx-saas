'use client'

import { useState, useEffect, useRef } from 'react'
import type { SkillProficiencyDef } from '../types'
import { upsertEmployeeSkill } from '../actions'

type Props = {
  employeeId: string
  skillId: string
  level: number
  proficiencyDefs: SkillProficiencyDef[]
}

export function SkillMatrixCell({ employeeId, skillId, level, proficiencyDefs }: Props) {
  const [open, setOpen] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(level)
  const [pending, setPending] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentDef = proficiencyDefs.find(d => d.level === currentLevel)
  const bgColor = currentDef ? currentDef.color_hex : '#f3f4f6'

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  async function handleSelect(newLevel: number) {
    setPending(true)
    setOpen(false)
    try {
      const result = await upsertEmployeeSkill({ employeeId, skillId, proficiencyLevel: newLevel })
      if (result.success) {
        setCurrentLevel(newLevel)
      } else {
        console.error('習熟度の更新に失敗しました:', result.error)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={pending}
        className="w-10 h-10 rounded border border-gray-200 transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{ backgroundColor: bgColor }}
        title={currentDef?.label ?? '未設定'}
        aria-label={`習熟度: ${currentDef?.label ?? '未設定'}`}
      />
      {open && (
        <div className="absolute z-10 top-11 left-0 bg-white border border-gray-200 rounded shadow-lg min-w-28">
          {proficiencyDefs.map(def => (
            <button
              key={def.level}
              onClick={() => handleSelect(def.level)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left"
            >
              <span
                className="w-4 h-4 rounded-sm inline-block"
                style={{ backgroundColor: def.color_hex }}
              />
              {def.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
