'use client'

import {
  createServiceClass,
  updateServiceClass,
  deleteServiceClass,
  setServiceCategoryClass,
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
  generateServiceAiAdvice,
} from '../actions'

export function useSystemMaster() {
  return {
    // Service Class
    createServiceClass,
    updateServiceClass,
    deleteServiceClass,
    setServiceCategoryClass,

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
    generateServiceAiAdvice,
  }
}
