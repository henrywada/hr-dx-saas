'use client';

import {
  createTenant,
  updateTenant,
  deleteTenant,
  resendInviteEmail,
} from '../actions';

/**
 * テナント管理用カスタムフック
 * Client Component から Server Actions を呼び出すためのラッパー
 */
export function useTenantManagement() {
  return {
    createTenant,
    updateTenant,
    deleteTenant,
    resendInviteEmail,
  };
}
