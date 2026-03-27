/**
 * マニュアル・ヘルプ本文（.md）をエントリ id にひもづける。
 * 新規項目は markdown/ 配下に .md を追加し、ここに import とマップを追記する。
 */
import attAttendanceThreeMethods from './markdown/attendance/att-attendance-three-methods.md';
import attOvertime from './markdown/attendance/att-overtime.md';
import attQr from './markdown/attendance/att-qr.md';
import attQrPerm from './markdown/attendance/att-qr-perm.md';
import attTelework from './markdown/attendance/att-telework.md';
import othBrowser from './markdown/other/oth-browser.md';
import othData from './markdown/other/oth-data.md';
import othSecurity from './markdown/other/oth-security.md';
import othSupport from './markdown/other/oth-support.md';
import pulseDashboard from './markdown/pulse/pulse-dashboard.md';
import pulseOverview from './markdown/pulse/pulse-overview.md';
import pulsePeriod from './markdown/pulse/pulse-period.md';
import recAiDraft from './markdown/recruitment/rec-ai-draft.md';
import recHellowork from './markdown/recruitment/rec-hellowork.md';
import recJobBasic from './markdown/recruitment/rec-job-basic.md';
import recMedia from './markdown/recruitment/rec-media.md';
import recOfferValidation from './markdown/recruitment/rec-offer-validation.md';
import setAnnounce from './markdown/settings/set-announce.md';
import setDivisions from './markdown/settings/set-divisions.md';
import setOrg from './markdown/settings/set-org.md';
import setProgramTargets from './markdown/settings/set-program-targets.md';
import setServiceAssign from './markdown/settings/set-service-assign.md';
import stressFlow from './markdown/stress/stress-flow.md';
import stressHeatmap from './markdown/stress/stress-heatmap.md';
import stressHigh from './markdown/stress/stress-high.md';
import stressProgress from './markdown/stress/stress-progress.md';
import stressSurveyDash from './markdown/stress/stress-survey-dash.md';

export const HELP_MARKDOWN_BY_ID: Record<string, string> = {
  'att-attendance-three-methods': attAttendanceThreeMethods,
  'att-overtime': attOvertime,
  'att-qr': attQr,
  'att-qr-perm': attQrPerm,
  'att-telework': attTelework,
  'oth-browser': othBrowser,
  'oth-data': othData,
  'oth-security': othSecurity,
  'oth-support': othSupport,
  'pulse-dashboard': pulseDashboard,
  'pulse-overview': pulseOverview,
  'pulse-period': pulsePeriod,
  'rec-ai-draft': recAiDraft,
  'rec-hellowork': recHellowork,
  'rec-job-basic': recJobBasic,
  'rec-media': recMedia,
  'rec-offer-validation': recOfferValidation,
  'set-announce': setAnnounce,
  'set-divisions': setDivisions,
  'set-org': setOrg,
  'set-program-targets': setProgramTargets,
  'set-service-assign': setServiceAssign,
  'stress-flow': stressFlow,
  'stress-heatmap': stressHeatmap,
  'stress-high': stressHigh,
  'stress-progress': stressProgress,
  'stress-survey-dash': stressSurveyDash,
};

/** 画面モーダル等から本文を取得（manual の entry.id と一致させる） */
export function getHelpMarkdown(contentId: string): string {
  const md = HELP_MARKDOWN_BY_ID[contentId];
  if (md === undefined) {
    return `（ヘルプ本文が未登録です: \`${contentId}\`）`;
  }
  return md;
}
