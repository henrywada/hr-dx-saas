export type AppRole = 'supaUser' | 'admin' | 'employee' | 'member';

export const CURRENT_USER_ROLE: AppRole = 'admin'; // Change this to test different roles

export const CURRENT_USER = {
  id: 'mock-user-001',
  name: '山田 太郎',
  email: 'taro.yamada@example.com',
  tenantId: 'tenant-001'
};