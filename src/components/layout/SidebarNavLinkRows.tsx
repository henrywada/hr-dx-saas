'use client'

import React from 'react'
import Link, { useLinkStatus } from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronRight,
  Briefcase,
  LayoutDashboard,
  Loader2,
  HeartPulse,
  Stethoscope,
  HeartHandshake,
  GraduationCap,
  BookOpen,
  ClipboardList,
  Clock,
  UserPlus,
  UserCog,
  Wrench,
  Settings,
  Workflow,
} from 'lucide-react'

/** カテゴリ名のキーワードに応じてふさわしいアイコンを返す（最初にマッチしたルールを採用） */
const CATEGORY_ICON_RULES: [RegExp, LucideIcon][] = [
  [/ストレスチェック/, HeartPulse],
  [/産業医|保健師/, Stethoscope],
  [/健康経営/, HeartHandshake],
  [/スキル|能力向上/, GraduationCap],
  [/研修|eラーニング/, BookOpen],
  [/アンケート/, ClipboardList],
  [/勤退|勤怠/, Clock],
  [/採用/, UserPlus],
  [/人事情報登録/, UserCog],
  [/ツールボックス/, Wrench],
  [/基本登録|基本設定/, Settings],
  [/業務処理/, Workflow],
]

function getCategoryIcon(categoryName: string): LucideIcon {
  const rule = CATEGORY_ICON_RULES.find(([pattern]) => pattern.test(categoryName))
  return rule ? rule[1] : Briefcase
}

type DashboardRowProps = {
  href: string
  isActive: boolean
  onNavigate: () => void
  linkClassName: string
}

function DashboardLinkInner({ isActive }: { isActive: boolean }) {
  const { pending } = useLinkStatus()
  return (
    <>
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#FD7601] rounded-r-full" />
      )}
      {pending ? (
        <Loader2
          className={`w-5 h-5 shrink-0 animate-spin ${isActive ? 'text-[#FD7601]' : 'text-[#57606a]'}`}
          aria-hidden
        />
      ) : (
        <LayoutDashboard
          className={`w-5 h-5 transition-colors ${
            isActive ? 'text-[#FD7601]' : 'text-[#57606a] group-hover:text-[#24292f]'
          }`}
        />
      )}
      <span className="flex-1">ダッシュボード</span>
      {isActive && !pending && <ChevronRight className="w-4 h-4 text-[#FD7601] opacity-50" />}
    </>
  )
}

export function SidebarDashboardLinkRow({
  href,
  isActive,
  onNavigate,
  linkClassName,
}: DashboardRowProps) {
  return (
    <Link href={href} onClick={onNavigate} className={linkClassName}>
      <DashboardLinkInner isActive={isActive} />
    </Link>
  )
}

type CategoryRowProps = {
  href: string
  categoryName: string
  active: boolean
  onNavigate: () => void
  linkClassName: string
}

function CategoryLinkInner({ active, categoryName }: { active: boolean; categoryName: string }) {
  const { pending } = useLinkStatus()
  const Icon = getCategoryIcon(categoryName)
  return (
    <>
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#FD7601] rounded-r-full" />
      )}
      {pending ? (
        <Loader2
          className={`w-5 h-5 shrink-0 animate-spin ${active ? 'text-[#FD7601]' : 'text-[#57606a]'}`}
          aria-hidden
        />
      ) : (
        <Icon
          className={`w-5 h-5 transition-colors ${
            active ? 'text-[#FD7601]' : 'text-[#57606a] group-hover:text-[#24292f]'
          }`}
        />
      )}
      <span className="flex-1">{categoryName}</span>
      {active && !pending ? <ChevronRight className="w-4 h-4 text-[#FD7601] opacity-50" /> : null}
    </>
  )
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
  )
}

type PlainRowProps = {
  href: string
  className: string
  icon: LucideIcon
  label: string
}

function PlainLinkInner({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const { pending } = useLinkStatus()
  return (
    <>
      {pending ? (
        <Loader2 className="w-5 h-5 shrink-0 animate-spin text-[#57606a]" aria-hidden />
      ) : (
        <Icon className="w-5 h-5 text-[#57606a] group-hover:text-[#24292f]" />
      )}
      <span className="flex-1 text-left">{label}</span>
    </>
  )
}

/** ポータルへ戻るなど、アイコン＋ラベルの単純なナビリンク */
export function SidebarPlainNavLink({ href, className, icon, label }: PlainRowProps) {
  return (
    <Link href={href} className={className}>
      <PlainLinkInner icon={icon} label={label} />
    </Link>
  )
}
