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
    /** 人事向け QR 表示権限 CSV 一括（従業員番号キー） */
    ADMIN_QR_SQP_CSV_IMPORT: '/adm/csv-import',
    /** 残業閾値設定（ルートグループ (qr_atendance)、URL は /adm/overtime-settings） */
    ADMIN_OVERTIME_SETTINGS: '/adm/overtime-settings',
    /** テレワーク端末ペアリング（(pc_atendance) グループ、URL は /adm/device-pairing） */
    ADMIN_DEVICE_PAIRING: '/adm/device-pairing',
    /** マニュアル集（(manual) グループ） */
    ADMIN_MANUAL: '/adm/manual',
    /** 人事向け勤怠管理ダッシュボード */
    ADMIN_ATTENDANCE_DASHBOARD: '/adm/attendance/dashboard',
  },
  SAAS: {
    DASHBOARD: '/saas_adm',
    TENANTS: '/saas_adm/tenants',
    SYSTEM_MASTER: '/saas_adm/system-master',
  }
} as const;
