import Link from 'next/link'
import React from 'react'

export default function AttendanceAppPage() {
  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">勤怠管理アプリ</h1>
      <p className="mb-6 text-gray-600">現場向け機能からお選びください。</p>
      <ul className="flex flex-col gap-3">
        <li>
          <Link
            href="/apps/attendance/qr-punch"
            className="block rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-lg font-semibold text-blue-900 hover:bg-blue-100"
          >
            QR 打刻（監督者）— 表示・リアルタイム承認
          </Link>
        </li>
        <li>
          <Link
            href="/apps/attendance/scan"
            className="block rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-lg font-semibold text-emerald-900 hover:bg-emerald-100"
          >
            QR 打刻（従業員）— スキャンして打刻
          </Link>
        </li>
      </ul>
    </div>
  )
}
