import React from 'react';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// カードデータの定義
const steps = [
    {
        id: 'pulse-survey',
        step: 'Pulse Survey',
        title: 'パルスサーベイ',
        description: '「その不調、手遅れになる前に。」',
        detail: '定期的な簡易アンケートを自動配信。回答推移をAIが分析し、従業員のコンディション変化や離職リスクの予兆をいち早く検知します。',
        status: 'ready',
        href: '/dashboard/well-being/pulse-survey',
        color: 'blue'
    },
    {
        id: 'stress-check',
        step: 'Stress Check',
        title: 'ストレスチェック',
        description: '「義務化対応を、もっと戦略的に。」',
        detail: '法令に準拠したストレスチェックをWeb上で完結。未受検者の自動リマインドから、高ストレス者の抽出、産業医面談の推奨までを自動化します。',
        status: 'completed',
        href: '/dashboard/well-being/stress-check',
        color: 'orange'
    },
    {
        id: 'staff-booster',
        step: 'Staff Booster',
        title: '社員増力化 & リファラル支援',
        description: '「社員の仕事を減らし、仲間を増やそう。」',
        detail: '忙しい社員の「日程調整」や「メール作成」をAIが代行し、業務負荷を軽減。生まれた余裕とAIのサポートで、心理的負担ゼロの「自然なリファラル紹介」を実現します。',
        status: 'pending',
        href: '/dashboard/team-building/staff-booster', // 暫定的に既存のパスへ
        color: 'emerald'
    }
];

export default function WellBeingPage() {
    return (
        <div className="flex-1 space-y-8 p-8 pt-6">
            <div className="mx-auto max-w-6xl space-y-8">
                <div className="flex items-center text-sm text-muted-foreground">
                    <Link href="/dashboard" className="hover:text-foreground transition-colors">
                        Home
                    </Link>
                    <span className="mx-2">/</span>
                    <span>組織の健康度測定・早期対応</span>
                </div>
                <div className="flex items-center justify-between space-y-2">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">組織の健康度測定・早期対応</h2>
                        <div className="flex items-center space-x-2 text-muted-foreground mt-2">
                            <span className="text-sm">test company</span>
                            <span className="text-sm">|</span>
                            <span className="text-sm">Test</span>
                        </div>
                        <p className="text-muted-foreground mt-4">
                            心身の健康状態を可視化し、組織のリスクを早期発見・解決するための3つのステップ。
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={cn(
                                "group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow transition-all hover:shadow-lg",
                                step.color === 'blue' && "hover:border-blue-500/50",
                                step.color === 'orange' && "hover:border-orange-500/50",
                                step.color === 'emerald' && "hover:border-emerald-500/50"
                            )}
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-xs font-medium",
                                        step.color === 'blue' && "bg-blue-100 text-blue-700",
                                        step.color === 'orange' && "bg-orange-100 text-orange-700",
                                        step.color === 'emerald' && "bg-emerald-100 text-emerald-700"
                                    )}>
                                        {step.step}
                                    </span>
                                    {step.status === 'completed' ? (
                                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-muted-foreground/30" />
                                    )}
                                </div>

                                <h3 className="text-xl font-bold mb-2 flex items-center">
                                    {step.color === 'blue' && <span className="mr-2 text-blue-500">📈</span>}
                                    {step.color === 'orange' && <span className="mr-2 text-orange-500">💗</span>}
                                    {step.color === 'emerald' && <span className="mr-2 text-emerald-500">👥</span>}
                                    {step.title}
                                </h3>

                                <p className="text-sm font-medium text-muted-foreground mb-4">
                                    {step.description}
                                </p>

                                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                                    {step.detail}
                                </p>
                            </div>

                            {/* Link Overlay */}
                            <Link href={step.href} className="absolute inset-0">
                                <span className="sr-only">View details</span>
                            </Link>

                            {/* Bottom decoration line */}
                            <div className={cn(
                                "absolute bottom-0 left-0 h-1 w-full",
                                step.color === 'blue' && "bg-blue-500",
                                step.color === 'orange' && "bg-orange-500",
                                step.color === 'emerald' && "bg-emerald-500"
                            )} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
