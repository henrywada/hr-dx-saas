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
    ADMIN_PULSE_SURVEY_PERIODS: '/adm/pulse-survey-periods',
    ADMIN_SERVICE_ASSIGNMENTS: '/adm/service-assignments',
    ADMIN_PROGRAM_TARGETS: '/adm/program-targets',
    ADMIN_HIGH_STRESS: '/adm/high-stress',
    ADMIN_HIGH_STRESS_FOLLOWUP: '/adm/high-stress-followup',
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
    ADMIN_WORK_ANALYSIS: '/adm/analysis',
    /** 残業申請の承認（上長・同一部署）— (default)/(overtime) */
    OVERTIME_APPROVAL: '/approval',
  },
  SAAS: {
    DASHBOARD: '/saas_adm',
    TENANTS: '/saas_adm/tenants',
    SYSTEM_MASTER: '/saas_adm/system-master',
  }
} as const;
