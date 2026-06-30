'use client'

import { useState } from 'react'
import { CareerAppointmentFormModal } from './CareerAppointmentFormModal'
import type {
  CareerDiscussionEmployeeOption,
  CareerDiscussionThemeTemplate,
} from '../types'

interface Props {
  employees: CareerDiscussionEmployeeOption[]
  templates: CareerDiscussionThemeTemplate[]
}

export function ScheduleAppointmentButton({ employees, templates }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        + 面談を予約
      </button>
      <CareerAppointmentFormModal
        open={open}
        onClose={() => setOpen(false)}
        employees={employees}
        templates={templates}
      />
    </>
  )
}
