'use client';

import { Users, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface SummaryCardsProps {
  totalEmployees: number;
  submittedCount: number;
  notSubmittedCount: number;
  consentCount: number;
  submissionRate: number;
  consentRate: number;
}

const cards = [
  {
    key: 'total',
    label: '対象者数',
    labelEn: 'Total Employees',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    getValue: (p: SummaryCardsProps) => p.totalEmployees,
    getSuffix: () => '名',
    getSub: () => null,
  },
  {
    key: 'submitted',
    label: '受検完了',
    labelEn: 'Completed',
    icon: CheckCircle2,
    color: 'from-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    getValue: (p: SummaryCardsProps) => p.submittedCount,
    getSuffix: () => '名',
    getSub: (p: SummaryCardsProps) => `受検率 ${p.submissionRate}%`,
  },
  {
    key: 'notSubmitted',
    label: '未受検',
    labelEn: 'Not Submitted',
    icon: AlertCircle,
    color: 'from-amber-500 to-orange-500',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    getValue: (p: SummaryCardsProps) => p.notSubmittedCount,
    getSuffix: () => '名',
    getSub: () => null,
  },
  {
    key: 'consent',
    label: '結果提供同意率',
    labelEn: 'Consent Rate',
    icon: ShieldCheck,
    color: 'from-violet-500 to-purple-600',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    getValue: (p: SummaryCardsProps) => p.consentRate,
    getSuffix: () => '%',
    getSub: (p: SummaryCardsProps) => `同意者 ${p.consentCount}名 / ${p.submittedCount}名`,
  },
];

export default function SummaryCards(props: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = card.getValue(props);
        const suffix = card.getSuffix();
        const sub = card.getSub(props);

        return (
          <div
            key={card.key}
            className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group"
          >
            {/* グラデーションのトップバー */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color}`} />

            <div className="p-5 pt-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-500 tracking-wide">{card.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{card.labelEn}</p>
                </div>
                <div className={`${card.iconBg} p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-gray-900 tabular-nums tracking-tight">
                  {value.toLocaleString()}
                </span>
                <span className="text-sm font-medium text-gray-500">{suffix}</span>
              </div>

              {sub && (
                <p className="text-xs text-gray-400 mt-2 font-medium">{sub}</p>
              )}

              {/* 受検率プログレスバー（受検完了カードのみ） */}
              {card.key === 'submitted' && (
                <div className="mt-3">
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${props.submissionRate}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
