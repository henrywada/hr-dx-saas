export const APP_ROUTES = {
  AUTH: {
    LOGIN: '/login',
    SIGNUP: '/signup',
    RESET_PASSWORD: '/reset-password',
    FORGOT_PASSWORD: '/forgot-password',
  },
  TENANT: {
    PORTAL: '/top',
    ADMIN: '/adm',
    ADMIN_ANNOUNCEMENTS: '/adm/announcements',
    /** テナント基本設定（お問合せメール等）— (base_mnt)/settings */
    ADMIN_SETTINGS: '/adm/settings',
    ADMIN_SERVICE_ASSIGNMENTS: '/adm/service-assignments',
    ADMIN_HIGH_STRESS: '/adm/high-stress',
    ADMIN_HIGH_STRESS_FOLLOWUP: '/adm/high-stress-followup',
    /** 拠点（事業場）マスタ — (org_health)/establishments */
    ADMIN_DIVISION_ESTABLISHMENTS: '/adm/establishments',
    /** ストレスチェック集団分析 */
    ADMIN_STRESS_CHECK_GROUP_ANALYSIS: '/adm/stress-check/group-analysis',
    ADMIN_AI_WORKPLACE_IMPROVEMENT: '/adm/ai-workplace-improvement',
    /** 管理者 QR 表示権限（(qr_atendance) グループ） */
    ADMIN_QR_ATENDANCE: '/adm/qr_atendance',
    /** 出勤・退勤データ実績 CSV 取り込み（(csv_atendance) グループ、URL は /adm/csv_atendance） */
    ADMIN_CSV_ATENDANCE: '/adm/csv_atendance',
    /** 残業閾値設定（ルートグループ (qr_atendance)、URL は /adm/overtime-settings） */
    ADMIN_OVERTIME_SETTINGS: '/adm/overtime-settings',
    /** テレワーク端末登録申請（(default) ポータル、URL は /device-pairing） */
    PORTAL_DEVICE_PAIRING: '/device-pairing',
    /** テレワーク端末の人事承認（(pc_atendance) グループ、URL は /adm/approve_pc） */
    ADMIN_APPROVE_PC: '/adm/approve_pc',
    /** マニュアル集（(manual) グループ） */
    ADMIN_MANUAL: '/adm/manual',
    /** 人事向け 出勤・退勤データの明細一覧（/adm/attendance/dashboard） */
    ADMIN_ATTENDANCE_DASHBOARD: '/adm/attendance/dashboard',
    /** 勤務状況分析（残業集計・リスク・乖離） */

    /** 残業申請の承認（上長・同一部署）— (default)/(overtime) */
    OVERTIME_APPROVAL: '/approval',
    /** 管理：人事ナレッジ（文書取り込み） */
    ADMIN_INQUIRY_KNOWLEDGE: '/adm/inquiry-chat-knowledge',
    /** アンケート管理（作成・設問編集・アサイン） */
    ADMIN_SURVEY: '/adm/Survey',
    /** アンケート実施期間管理 */
    SURVEY_PERIODS: (id: string) => `/adm/Survey/${id}/periods`,
    /** 従業員回答画面（アサインされたアンケートの一覧・回答） */
    SURVEY_ANSWERS: '/answers',
    /** Echo設問管理（テンプレートコピー・カスタマイズ・本番指定） */
    ADMIN_TENANT_QUESTIONNAIRE: '/adm/tenant_questionnaire',
    /** eラーニング コース管理 */
    ADMIN_EL_COURSES: '/adm/el-courses',
    /** eラーニング コース詳細（スライド編集） */
    ADMIN_EL_COURSE_DETAIL: (id: string) => `/adm/el-courses/${id}`,
    /** eラーニング 受講割り当て管理 */
    ADMIN_EL_ASSIGNMENTS: '/adm/el-assignments',
    /** eラーニング マイコース一覧（従業員向け） */
    EL_MY_COURSES: '/el-courses',
    /** eラーニング コース受講画面（アサインIDベース） */
    EL_MY_COURSE_VIEWER: (assignmentId: string) => `/el-courses/${assignmentId}`,
    // スキルマップ
    ADMIN_SKILL_MAP: '/adm/skill-map',
    /** 技能マスタ管理（テンプレートからのコピー専用画面） */
    ADMIN_SKILL_TEMP_COPY: '/adm/skill-tempCopy',
    /** スキル申請 人事最終承認 */
    ADMIN_SKILL_APPLICATIONS: '/adm/skill-map/applications',
    /** 承認者マスタ管理 */
    ADMIN_SKILL_APPROVERS: '/adm/skill-map/approvers',
    /** 従業員マイスキルポータル */
    MY_SKILLS: '/my-skills',
    /** 上長スキル承認 */
    SKILL_APPROVALS: '/skill-approvals',
    /** 従業員マイ育成ジャーニー */
    MY_SKILLS_JOURNEY: '/my-skills/journey',
    /** 従業員 SOS 相談画面 */
    MY_SKILLS_JOURNEY_CONSULT: '/my-skills/journey/consult',
    /** 上司 育成ジャーニーボード（:employeeId） */
    SKILL_JOURNEY: (employeeId: string) => `/skill-approvals/journey/${employeeId}`,
    /** 上司 目標提案フォーム（:employeeId） */
    SKILL_JOURNEY_PROPOSE: (employeeId: string) => `/skill-approvals/journey/${employeeId}/propose`,
    /** 採用ファネルダッシュボード（P1-A） — (recurit) はルートグループのため URL パスは /adm/funnel */
    ADMIN_RECRUIT_FUNNEL: '/adm/funnel',
    /** 労務コンプライアンスダッシュボード（P1-B） */
    ADMIN_LABOR_COMPLIANCE: '/adm/labor-compliance',
    /** 横断KPIダッシュボード（経営層向け）（P1-D） */
    ADMIN_HR_KPI: '/adm/hr-kpi',
    /** 離職予兆スコアリング & アラート（P2-A） */
    ADMIN_TURNOVER_RISK: '/adm/turnover-risk',
  },
  SAAS: {
    DASHBOARD: '/saas_adm',
    TENANTS: '/saas_adm/tenants',
    SYSTEM_MASTER: '/saas_adm/system-master',
    /** Echoテンプレート管理（設問テンプレートのCRUD） */
    ECHO_TEMPLATE: '/saas_adm/echo_template',
    /** eラーニング テンプレートコース管理（developer専用） */
    EL_TEMPLATES: '/saas_adm/el-templates',
    /** eラーニング テンプレートコース詳細（スライド編集） */
    EL_TEMPLATE_DETAIL: (id: string) => `/saas_adm/el-templates/${id}`,
    /** グローバルスキル・レベル登録 */
    SKILL_TEMPLATES: '/saas_adm/skill-templates',
    /** グローバル評価テンプレート管理（SaaS管理者専用） */
    EVAL_GLOBAL_TEMPLATES: '/saas_adm/evaluation-global-templates',
    /** グローバル評価テンプレート詳細 */
    EVAL_GLOBAL_TEMPLATE_DETAIL: (id: string) => `/saas_adm/evaluation-global-templates/${id}`,
  },
  EVALUATION: {
    /** 評価シート一覧（テナント管理者） */
    ADMIN_LIST: '/adm/evaluation',
    /** 評価シート詳細（テナント管理者視点） */
    ADMIN_SHEET: (sheetId: string) => `/adm/evaluation/${sheetId}`,
    /** テナント評価テンプレート管理 */
    ADMIN_TEMPLATES: '/adm/evaluation-templates',
    /** テナント評価テンプレート詳細・編集 */
    ADMIN_TEMPLATE_DETAIL: (templateId: string) => `/adm/evaluation-templates/${templateId}`,
    /** 評価期間管理 */
    ADMIN_PERIODS: '/adm/evaluation-periods',
    /** 従業員：自己評価トップ */
    MY_EVALUATION: '/my-evaluation',
    /** 従業員：評価シート詳細入力 */
    MY_EVALUATION_SHEET: (sheetId: string) => `/my-evaluation/${sheetId}`,
    /** ワークフロー進捗管理（テナント管理者） */
    WORKFLOW: '/adm/evaluation/workflow',
  },
} as const
