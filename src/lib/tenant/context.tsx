"use client";

import React, { createContext, useContext } from 'react';

interface TenantContextType {
  tenantId: string | undefined;
  tenantName: string | undefined;
}

const TenantContext = createContext<TenantContextType>({ tenantId: undefined, tenantName: undefined });

export function TenantProvider({ 
  tenantId, 
  tenantName, 
  children 
}: { 
  tenantId?: string;
  tenantName?: string;
  children: React.ReactNode 
}) {
  return (
    <TenantContext.Provider value={{ tenantId, tenantName }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
