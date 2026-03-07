import os

base_path = '/home/hr-dx/ai-projects/hr-dx-saas/src/lib'
file_path = os.path.join(base_path, 'auth-mock.ts')

content = """export type AppRole = 'supaUser' | 'admin' | 'employee' | 'member';

export const CURRENT_USER_ROLE: AppRole = 'admin'; // Change this to test different roles

export const CURRENT_USER = {
  id: 'mock-user-001',
  name: '山田 太郎',
  email: 'taro.yamada@example.com',
  tenantId: 'tenant-001'
};
"""

os.makedirs(base_path, exist_ok=True)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content.strip())
    print(f"Written: {file_path}")
