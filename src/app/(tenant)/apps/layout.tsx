import React from 'react';

export default function AppsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="apps-layout">{children}</div>;
}
