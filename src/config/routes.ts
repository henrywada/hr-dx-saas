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
    ADMIN_SKILL_MAP_REQUIREMENTS: '/adm/skill-map/requirements',
    ADMIN_SKILL_MAP_QUALIFICATIONS: '/adm/skill-map/qualifications',
    ADMIN_SKILL_MAP_SIMULATION: '/adm/skill-map/simulation',
    ADMIN_SKILL_MAP_SIMULATION_DETAIL: (draftId: string) => `/adm/skill-map/simulation/${draftId}`,
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
  },
} as const
