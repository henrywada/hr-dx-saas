// src/features/condition-checkin/labels.ts

/**
 * 固定の単一設問。パルスサーベイのような可変・複数設問ではない。
 * トレンド比較の一貫性を保つため、将来的にも変更しない前提で設計する。
 */
export const CHECKIN_QUESTION = '今日の気分・体調はどうですか？'

export const SCORE_EMOJI: Record<number, string> = {
  1: '😞',
  2: '🙁',
  3: '😐',
  4: '🙂',
  5: '😄',
}

export const SCORE_LABEL: Record<number, string> = {
  1: 'よくない',
  2: 'あまりよくない',
  3: 'ふつう',
  4: 'よい',
  5: 'とてもよい',
}
