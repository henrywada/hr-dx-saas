'use client';

import { Activity, AlertTriangle, ShieldAlert, Users } from 'lucide-react';
import type { GroupAnalysisSummary } from '../types';

interface Props {
  summary: GroupAnalysisSummary;
}

export default function GroupSummaryCards({ summary }: Props) {
  const riskColor = summary.overallHealthRisk
    ? summary.overallHealthRisk >= 120
      ? 'from-red-500 to-rose-600'
      : summary.overallHealthRisk >= 100
        ? 'from-amber-500 to-orange-500'
        : 'from-emerald-500 to-green-500'
    : 'from-gray-400 to-gray-500';

  const riskBgColor = summary.overallHealthRisk
    ? summary.overallHealthRisk >= 120
      ? 'bg-red-50'
      : summary.overallHealthRisk >= 100
        ? 'bg-amber-50'
        : 'bg-emerald-50'
    : 'bg-gray-50';

  const riskIconColor = summary.overallHealthRisk
    ? summary.overallHealthRisk >= 120
      ? 'text-red-500'
      : summary.overallHealthRisk >= 100
        ? 'text-amber-500'
        : 'text-emerald-500'
    : 'text-gray-400';

  const cards = [
    {
      label: '総合健康リスク',
      labelEn: 'Overall Health Risk',
      value: summary.overallHealthRisk != null ? `${summary.overallHealthRisk}` : '—',
      suffix: summary.overallHealthRisk != null ? '' : '',
      sub: '全国平均 = 100',
      icon: Activity,
      gradient: riskColor,
      iconBg: riskBgColor,
      iconColor: riskIconColor,
    },
    {
      label: '分析対象者数',
      labelEn: 'Total Respondents',
      value: summary.totalRespondents.toLocaleString(),
      suffix: '名',
      sub: summary.maskedDepartmentCount > 0
        ? `${summary.maskedDepartmentCount}部署がマスキング対象`
        : '全部署が分析対象',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-500',
    },
    {
      label: '高ストレス者率',
      labelEn: 'High Stress Rate',
      value: `${summary.overallHighStressRate}`,
      suffix: '%',
      sub: '全社平均',
      icon: AlertTriangle,
      gradient: summary.overallHighStressRate >= 15
        ? 'from-red-500 to-rose-600'
        : summary.overallHighStressRate >= 10
          ? 'from-amber-500 to-orange-500'
          : 'from-emerald-500 to-green-500',
      iconBg: summary.overallHighStressRate >= 15 ? 'bg-red-50' : summary.overallHighStressRate >= 10 ? 'bg-amber-50' : 'bg-emerald-50',
      iconColor: summary.overallHighStressRate >= 15 ? 'text-red-500' : summary.overallHighStressRate >= 10 ? 'text-amber-500' : 'text-emerald-500',
    },
    {
      label: 'マスキング部署',
      labelEn: 'Masked Departments',
      value: `${summary.maskedDepartmentCount}`,
      suffix: '部署',
      sub: '回答者10名未満',
      icon: ShieldAlert,
      gradient: 'from-slate-500 to-gray-600',
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group"
          >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />
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
                  {card.value}
                </span>
                {card.suffix && (
                  <span className="text-sm font-medium text-gray-500">{card.suffix}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2 font-medium">{card.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
