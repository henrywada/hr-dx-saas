/** API GET /api/adm/closure/[closure_id]/timecard-anomalies の行 */
export type AnomalyListItem = {
  anomaly_type: string
  employee_id: string
  record_date: string
  work_time_record_id: string
  details: Record<string, unknown> | null
  employee_name: string
}
