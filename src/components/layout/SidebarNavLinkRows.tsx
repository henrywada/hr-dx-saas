'use client';

import React from 'react';
import Link, { useLinkStatus } from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight, Briefcase, LayoutDashboard, Loader2 } from 'lucide-react';

type DashboardRowProps = {
  href: string;
  isActive: boolean;
  onNavigate: () => void;
  linkClassName: string;
};

function DashboardLinkInner({ isActive }: { isActive: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-orange rounded-r-full" />
      )}
      {pending ? (
        <Loader2
          className={`w-5 h-5 shrink-0 animate-spin ${isActive ? 'text-accent-orange' : 'text-slate-400'}`}
          aria-hidden
        />
      ) : (
        <LayoutDashboard
          className={`w-5 h-5 transition-colors ${
            isActive ? 'text-accent-orange' : 'text-slate-400 group-hover:text-slate-600'
          }`}
        />
      )}
      <span className="flex-1">ダッシュボード</span>
      {isActive && !pending && <ChevronRight className="w-4 h-4 text-accent-orange opacity-50" />}
    </>
  );
}

export function SidebarDashboardLinkRow({ href, isActive, onNavigate, linkClassName }: DashboardRowProps) {
  return (
    <Link href={href} onClick={onNavigate} className={linkClassName}>
      <DashboardLinkInner isActive={isActive} />
    </Link>
  );
}

type CategoryRowProps = {
  href: string;
  categoryName: string;
  active: boolean;
  onNavigate: () => void;
  linkClassName: string;
};

function CategoryLinkInner({ active, categoryName }: { active: boolean; categoryName: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent-orange rounded-r-full" />
      )}
      {pending ? (
        <Loader2
          className={`w-5 h-5 shrink-0 animate-spin ${active ? 'text-accent-orange' : 'text-slate-400'}`}
          aria-hidden
        />
      ) : (
        <Briefcase
          className={`w-5 h-5 transition-colors ${
            active ? 'text-accent-orange' : 'text-slate-400 group-hover:text-slate-600'
          }`}
        />
      )}
      <span className="flex-1">{categoryName}</span>
      {active && !pending ? <ChevronRight className="w-4 h-4 text-accent-orange opacity-50" /> : null}
    </>
  );
}

export function SidebarCategoryLinkRow({
  href,
  categoryName,
  active,
  onNavigate,
  linkClassName,
}: CategoryRowProps) {
  return (
    <Link href={href} onClick={onNavigate} className={linkClassName}>
      <CategoryLinkInner active={active} categoryName={categoryName} />
    </Link>
  );
}

type PlainRowProps = {
  href: string;
  className: string;
  icon: LucideIcon;
  label: string;
};

function PlainLinkInner({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? (
        <Loader2 className="w-5 h-5 shrink-0 animate-spin text-slate-400" aria-hidden />
      ) : (
        <Icon className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
      )}
      <span className="flex-1 text-left">{label}</span>
    </>
  );
}

/** ポータルへ戻るなど、アイコン＋ラベルの単純なナビリンク */
export function SidebarPlainNavLink({ href, className, icon, label }: PlainRowProps) {
  return (
    <Link href={href} className={className}>
      <PlainLinkInner icon={icon} label={label} />
    </Link>
  );
}

