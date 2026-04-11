'use client';

import {
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  createService,
  updateService,
  deleteService,
  createAppRole,
  updateAppRole,
  deleteAppRole,
  toggleAppRoleService,
  bulkSetAppRoleServiceColumn,
  getAppRoleServices,
  toggleTenantService,
  bulkSetTenantServices,
  getTenantServices,
  generateAiAdvice,
} from '../actions';

export function useSystemMaster() {
  return {
    // Service Category
    createServiceCategory,
    updateServiceCategory,
    deleteServiceCategory,
    
    // Service
    createService,
    updateService,
    deleteService,
    
    // App Role
    createAppRole,
    updateAppRole,
    deleteAppRole,
    
    // App Role Service
    toggleAppRoleService,
    bulkSetAppRoleServiceColumn,
    getAppRoleServices,
    
    // Tenant Service
    toggleTenantService,
    bulkSetTenantServices,
    getTenantServices,

    // AI Advice
    generateAiAdvice,
  };
}