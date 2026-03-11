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
  },
  SAAS: {
    DASHBOARD: '/saas_adm',
    TENANTS: '/saas_adm/tenants',
    SYSTEM_MASTER: '/saas_adm/system-master',
  }
} as const;
