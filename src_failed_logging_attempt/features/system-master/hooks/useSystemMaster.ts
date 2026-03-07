'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
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
} from '../actions';

export function useSystemMaster() {
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    // データ取得処理（必要に応じて実装）
  }, []);

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
    
    // Utility
    fetchData,
  };
}