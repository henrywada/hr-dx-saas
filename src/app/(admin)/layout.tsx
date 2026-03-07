import React from 'react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="admin-layout">{children}</div>;
}

// Trigger Vercel Build: 2026-03-07
