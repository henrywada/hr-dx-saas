import type { EventAudienceType, InternalEvent } from './types'

/** イベント対象範囲の表示ラベル */
export function formatEventAudienceLabel(
  event: Pick<InternalEvent, 'audience_type' | 'division_name'>,
): string {
  if (event.audience_type === 'division') {
    return event.division_name ? `${event.division_name}（配下含む）` : '部署限定'
  }
  return '全社'
}

/** Server Action 用: audience_type に応じて division_id を正規化 */
export function normalizeEventAudienceInput(input: {
  audience_type: EventAudienceType
  division_id?: string | null
}): { audience_type: EventAudienceType; division_id: string | null } {
  if (input.audience_type === 'tenant') {
    return { audience_type: 'tenant', division_id: null }
  }
  return {
    audience_type: 'division',
    division_id: input.division_id ?? null,
  }
}
