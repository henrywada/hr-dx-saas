import type { EventAttendee } from '../../types'

interface Props {
  attendees: EventAttendee[]
}

const STATUS_LABEL: Record<string, string> = {
  attending: '出席',
  declined: '欠席',
  pending: '未回答',
}

const STATUS_CLASS: Record<string, string> = {
  attending: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-rose-100 text-rose-800',
  pending: 'bg-slate-100 text-slate-600',
}

export function EventAttendeeTable({ attendees }: Props) {
  if (attendees.length === 0) {
    return <p className="text-xs text-slate-500">参加者の回答はまだありません。</p>
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500">
          <th className="text-left py-1 px-2 font-semibold">氏名</th>
          <th className="text-left py-1 px-2 font-semibold">RSVP状態</th>
        </tr>
      </thead>
      <tbody>
        {attendees.map(attendee => (
          <tr key={attendee.employee_id} className="border-b border-slate-100 last:border-0">
            <td className="py-1 px-2 text-slate-900">{attendee.employee_name}</td>
            <td className="py-1 px-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_CLASS[attendee.rsvp_status]}`}
              >
                {STATUS_LABEL[attendee.rsvp_status]}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
