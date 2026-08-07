import type { DeliveryFrequency } from '@/features/grant-notifier/types'

/**
 * このテナントに今回の起動で配信すべきか。
 *  - weekly: 毎回の起動で配信する
 *  - monthly: 当月にまだ配信していなければ配信する（月の初回起動でのみ送る）
 */
export function shouldDeliverForFrequency(
  frequency: DeliveryFrequency,
  hasDeliveredThisMonth: boolean
): boolean {
  if (frequency === 'weekly') return true
  return !hasDeliveredThisMonth
}
