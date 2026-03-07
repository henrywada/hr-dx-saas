// src/features/tenant-management/index.ts
// barrel export

export { default as TenantManagementPage } from './components/TenantManagementPage';
export { default as TenantFormDialog } from './components/TenantFormDialog';
export { getAllTenants } from './queries';
export { createTenant, updateTenant, deleteTenant } from './actions';
export { useTenantManagement } from './hooks/useTenantManagement';
export type { Tenant, TenantWithManager, TenantFormData, TenantUpdateData, TenantActionResult } from './types';
