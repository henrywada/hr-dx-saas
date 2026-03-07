/**
 * TalentDraft AI — 採用 AI ドメイン
 *
 * AI を活用した求人キャッチコピー生成、スカウト文作成、面接ガイド生成を提供する
 * 業務アプリケーションドメインです。
 */

// Types
export type { RecruitmentJob, AiGenerationResult } from './types';
export { isProFeatureAvailable } from './types';

// Actions
export { generateJobContent } from './actions';
export type { GenerateJobInput } from './actions';

// Queries
export { getRecruitmentJobs, getRecruitmentJob } from './queries';

// Components
export { PaywallOverlay } from './components/PaywallOverlay';
export { AiOutputDisplay } from './components/AiOutputDisplay';
export { AiJobForm } from './components/AiJobForm';
