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
  getAppRoleServices,
  toggleTenantService,
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
    getAppRoleServices,
    
    // Tenant Service
    toggleTenantService,
    getTenantServices,

    // AI Advice
    generateAiAdvice,
  };
}