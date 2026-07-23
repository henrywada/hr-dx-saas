/**
 * マニュアル・ヘルプ本文（.md）をエントリ id にひもづける。
 * 新規項目は markdown/ 配下に .md を追加し、ここに import とマップを追記する。
 */
import aiHrAssistantGuide from './markdown/ai-agent/ai-hr-assistant-guide.md'
import att36analysisGuide from './markdown/attendance/att-36analysis-guide.md'
import carCareerDiscussionsGuide from './markdown/career/car-career-discussions-guide.md'
import carJourneyConsultGuide from './markdown/career/car-journey-consult-guide.md'
import attAttendanceThreeMethods from './markdown/attendance/att-attendance-three-methods.md'
import attOvertime from './markdown/attendance/att-overtime.md'
import attQr from './markdown/attendance/att-qr.md'
import attQrPerm from './markdown/attendance/att-qr-perm.md'
import attTelework from './markdown/attendance/att-telework.md'
import conConsultationGuide from './markdown/consultation/con-consultation-guide.md'
import conConsultationInboxGuide from './markdown/consultation/con-consultation-inbox-guide.md'
import engKudosGuide from './markdown/engagement/eng-kudos-guide.md'
import lcDashboardGuide from './markdown/labor-compliance/lc-dashboard-guide.md'
import myouCompaniesGuide from './markdown/myou/myou-companies-guide.md'
import myouDeliveryHistoryGuide from './markdown/myou/myou-delivery-history-guide.md'
import myouDeliveryScanGuide from './markdown/myou/myou-delivery-scan-guide.md'
import myouExpirationAlertsGuide from './markdown/myou/myou-expiration-alerts-guide.md'
import myouInventoryGuide from './markdown/myou/myou-inventory-guide.md'
import myouReceivingScanGuide from './markdown/myou/myou-receiving-scan-guide.md'
import myouTraceabilityGuide from './markdown/myou/myou-traceability-guide.md'
import ooAdminDashboardGuide from './markdown/one-on-one/oo-admin-dashboard-guide.md'
import ooMyHistory from './markdown/one-on-one/oo-my-history.md'
import orgTeamConnectGuide from './markdown/organization/org-team-connect-guide.md'
import othBrowser from './markdown/other/oth-browser.md'
import othData from './markdown/other/oth-data.md'
import othSecurity from './markdown/other/oth-security.md'
import othSupport from './markdown/other/oth-support.md'
import pulseDashboard from './markdown/pulse/pulse-dashboard.md'
import pulseOverview from './markdown/pulse/pulse-overview.md'
import pulsePeriod from './markdown/pulse/pulse-period.md'
import recAiDraft from './markdown/recruitment/rec-ai-draft.md'
import recHellowork from './markdown/recruitment/rec-hellowork.md'
import recJobBasic from './markdown/recruitment/rec-job-basic.md'
import recMedia from './markdown/recruitment/rec-media.md'
import recOfferValidation from './markdown/recruitment/rec-offer-validation.md'
import recReferralGuide from './markdown/recruitment/rec-referral-guide.md'
import recReferralMyGuide from './markdown/recruitment/rec-referral-my-guide.md'
import setAnnounce from './markdown/settings/set-announce.md'
import setDivisions from './markdown/settings/set-divisions.md'
import setOrg from './markdown/settings/set-org.md'
import setServiceAssign from './markdown/settings/set-service-assign.md'
import stressFlow from './markdown/stress/stress-flow.md'
import stressHigh from './markdown/stress/stress-high.md'
import stressMyResult from './markdown/stress/stress-my-result.md'
import stressProgress from './markdown/stress/stress-progress.md'
import stressSurveyDash from './markdown/stress/stress-survey-dash.md'

export const HELP_MARKDOWN_BY_ID: Record<string, string> = {
  'ai-hr-assistant-guide': aiHrAssistantGuide,
  'att-36analysis-guide': att36analysisGuide,
  'att-attendance-three-methods': attAttendanceThreeMethods,
  'att-overtime': attOvertime,
  'att-qr': attQr,
  'att-qr-perm': attQrPerm,
  'att-telework': attTelework,
  'car-career-discussions-guide': carCareerDiscussionsGuide,
  'car-journey-consult-guide': carJourneyConsultGuide,
  'con-consultation-guide': conConsultationGuide,
  'con-consultation-inbox-guide': conConsultationInboxGuide,
  'eng-kudos-guide': engKudosGuide,
  'lc-dashboard-guide': lcDashboardGuide,
  'myou-companies-guide': myouCompaniesGuide,
  'myou-delivery-history-guide': myouDeliveryHistoryGuide,
  'myou-delivery-scan-guide': myouDeliveryScanGuide,
  'myou-expiration-alerts-guide': myouExpirationAlertsGuide,
  'myou-inventory-guide': myouInventoryGuide,
  'myou-receiving-scan-guide': myouReceivingScanGuide,
  'myou-traceability-guide': myouTraceabilityGuide,
  'oo-admin-dashboard-guide': ooAdminDashboardGuide,
  'oo-my-history': ooMyHistory,
  'org-team-connect-guide': orgTeamConnectGuide,
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
  'rec-referral-guide': recReferralGuide,
  'rec-referral-my-guide': recReferralMyGuide,
  'set-announce': setAnnounce,
  'set-divisions': setDivisions,
  'set-org': setOrg,
  'set-service-assign': setServiceAssign,
  'stress-flow': stressFlow,
  'stress-high': stressHigh,
  'stress-my-result': stressMyResult,
  'stress-progress': stressProgress,
  'stress-survey-dash': stressSurveyDash,
}

/** 画面モーダル等から本文を取得（manual の entry.id と一致させる） */
export function getHelpMarkdown(contentId: string): string {
  const md = HELP_MARKDOWN_BY_ID[contentId]
  if (md === undefined) {
    return `（ヘルプ本文が未登録です: \`${contentId}\`）`
  }
  return md
}
