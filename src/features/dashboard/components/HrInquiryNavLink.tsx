'use client';

import Link from 'next/link';

const linkClassName =
  'inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors shrink-0 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-700';

/** 遷移先が決まったらパスを設定（例: '/contact/hr'）。null の間はクリックで遷移しません */
const HR_INQUIRY_HREF: string | null = null;

export function HrInquiryNavLink() {
  const label = '❓人事へのお問合せ';

  if (HR_INQUIRY_HREF) {
    return (
      <Link href={HR_INQUIRY_HREF} className={linkClassName}>
        {label}
      </Link>
    );
  }

  return (
    <span className={`${linkClassName} cursor-default`} title="遷移先は後日設定予定です">
      {label}
    </span>
  );
}
