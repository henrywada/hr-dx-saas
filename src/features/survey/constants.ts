/** `pulse_survey_responses.score` の DB 制約とアプリ検証の共通範囲 */
export const PULSE_SURVEY_SCORE_MIN = 1;
export const PULSE_SURVEY_SCORE_MAX = 10;

/** Echo パルス回答の評価表行用・10段階リッカート */
export const PULSE_LIKERT_OPTIONS: ReadonlyArray<{
  value: number;
  label: string;
  shortLabel: string;
}> = [
  { value: 1, label: '全くそう思わない', shortLabel: '全く' },
  { value: 2, label: 'ほとんどそう思わない', shortLabel: 'ほぼ反' },
  { value: 3, label: 'あまりそう思わない', shortLabel: 'あまり' },
  { value: 4, label: 'ややそう思わない', shortLabel: 'やや反' },
  { value: 5, label: 'どちらでもない', shortLabel: '中立' },
  { value: 6, label: 'ややそう思う', shortLabel: 'やや賛' },
  { value: 7, label: 'そう思う', shortLabel: 'そう' },
  { value: 8, label: 'かなりそう思う', shortLabel: 'かなり' },
  { value: 9, label: 'とてもそう思う', shortLabel: 'とても' },
  { value: 10, label: '非常にそう思う', shortLabel: '非常に' },
];
