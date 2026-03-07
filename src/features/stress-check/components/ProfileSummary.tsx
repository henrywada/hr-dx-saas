'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Brain,
  Users,
  BarChart3,
  Home,
} from 'lucide-react';
import type { StressCheckResultData, ScaleScore } from '../queries';

// ============================================================
// 尺度名のキーワードマッチング（ResultChart と同じ基準）
// ============================================================
const CHART2_KEYWORDS = ['活気', 'イライラ', '疲労', '不安', '抑うつ', '身体愁訴'];
const CHART1_KEYWORDS = [
  '仕事の負担', '負担（量）', '負担（質）', '身体的負担',
  '対人関係', '職場環境', 'コントロール', '技能の活用',
  '適性度', '適正度', '働きがい',
];
const CHART3_KEYWORDS = ['上司', '同僚', '家族', '友人', '満足'];

function matchesGroup(scaleName: string, keywords: string[]): boolean {
  return keywords.some((kw) => scaleName.includes(kw));
}

function getReactionScales(scaleScores: ScaleScore[]): ScaleScore[] {
  return scaleScores.filter((s) => matchesGroup(s.scaleName, CHART2_KEYWORDS));
}

function getStressorScales(scaleScores: ScaleScore[]): ScaleScore[] {
  return scaleScores.filter(
    (s) => matchesGroup(s.scaleName, CHART1_KEYWORDS) || s.category === 'A'
  );
}

function getSupportScales(scaleScores: ScaleScore[]): ScaleScore[] {
  return scaleScores.filter(
    (s) => matchesGroup(s.scaleName, CHART3_KEYWORDS) || s.category === 'C' || s.category === 'D'
  );
}

// ============================================================
// ヘルパー: 指摘メッセージの生成
// ============================================================
function generateReactionMessages(reactions: ScaleScore[]): string[] {
  const msgs: string[] = [];
  for (const s of reactions) {
    if (s.evalPoint >= 4.0) {
      if (s.scaleName.includes('活気')) msgs.push('活気が低下しており、仕事への意欲が減退している可能性があります。');
      else if (s.scaleName.includes('イライラ')) msgs.push('イライラ感が強く出ており、精神的な余裕が低下している可能性があります。');
      else if (s.scaleName.includes('疲労')) msgs.push('疲労感が蓄積しているようです。十分な休息を取ることが重要です。');
      else if (s.scaleName.includes('不安')) msgs.push('不安感が高い傾向にあります。信頼できる方への相談をおすすめします。');
      else if (s.scaleName.includes('抑うつ')) msgs.push('抑うつ的な傾向が見られます。早めに専門家にご相談ください。');
      else if (s.scaleName.includes('身体愁訴')) msgs.push('身体的な不調が出ているようです。体調管理にご注意ください。');
      else msgs.push(`「${s.scaleName}」の評価点が高く、注意が必要です。`);
    }
  }
  return msgs;
}

function generateStressorMessages(stressors: ScaleScore[]): string[] {
  const msgs: string[] = [];
  for (const s of stressors) {
    if (s.evalPoint >= 4.0) {
      if (s.scaleName.includes('量')) msgs.push('仕事の量的な負担が大きいようです。業務量の調整やタスクの優先順位付けを検討しましょう。');
      else if (s.scaleName.includes('質')) msgs.push('仕事の質的な負担（難易度・集中力の要求）が高いようです。');
      else if (s.scaleName.includes('対人関係')) msgs.push('職場の対人関係にストレスを感じているようです。上司や相談窓口への相談を検討しましょう。');
      else if (s.scaleName.includes('職場環境')) msgs.push('職場の物理的環境にストレスを感じているようです。');
      else if (s.scaleName.includes('コントロール')) msgs.push('仕事の裁量度が低く、コントロール感が不足しているようです。');
      else msgs.push(`「${s.scaleName}」に負荷を感じているようです。`);
    }
  }
  return msgs;
}

function generateSupportMessages(supports: ScaleScore[]): string[] {
  const msgs: string[] = [];
  for (const s of supports) {
    if (s.evalPoint >= 4.0) {
      if (s.scaleName.includes('上司')) msgs.push('上司からのサポートが不足していると感じているようです。定期的な面談や相談の機会を設けることが大切です。');
      else if (s.scaleName.includes('同僚')) msgs.push('同僚からのサポートが十分でないと感じているようです。チーム内のコミュニケーションを見直しましょう。');
      else if (s.scaleName.includes('家族') || s.scaleName.includes('友人')) msgs.push('プライベートにおけるサポートが不足気味です。身近な人との交流時間を増やしてみましょう。');
      else if (s.scaleName.includes('満足')) msgs.push('仕事や生活への満足度が低い傾向にあります。自分にとって大切なことを見直す機会を持ちましょう。');
      else msgs.push(`「${s.scaleName}」のサポートが不足している可能性があります。`);
    }
  }
  return msgs;
}

// ============================================================
// メインコンポーネント
// ============================================================
interface ProfileSummaryProps {
  result: StressCheckResultData;
}

export default function ProfileSummary({ result }: ProfileSummaryProps) {
  const answeredDate = result.answeredAt
    ? new Date(result.answeredAt).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  const reactions = getReactionScales(result.scaleScores);
  const stressors = getStressorScales(result.scaleScores);
  const supports = getSupportScales(result.scaleScores);

  const reactionMsgs = generateReactionMessages(reactions);
  const stressorMsgs = generateStressorMessages(stressors);
  const supportMsgs = generateSupportMessages(supports);

  // 全体の平均評価点
  const overallAvg = result.scaleScores.length > 0
    ? Math.round(
        (result.scaleScores.reduce((sum, s) => sum + s.evalPoint, 0) / result.scaleScores.length) * 10
      ) / 10
    : 0;

  const overallStatus = overallAvg <= 2.0
    ? { label: '良好', description: 'ストレスが比較的少なく、良好な状態です。', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 }
    : overallAvg <= 3.0
    ? { label: '概ね良好', description: '全体的に大きな問題は見られません。引き続きセルフケアを心がけましょう。', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', icon: CheckCircle2 }
    : overallAvg <= 3.8
    ? { label: 'やや注意', description: 'いくつかの領域でストレスの兆候が見られます。以下の詳細をご確認ください。', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle }
    : { label: '要注意', description: '複数の領域でストレスが高い傾向があります。産業医面談などのサポートをご検討ください。', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle };

  const StatusIcon = overallStatus.icon;
  const hasConcerns = reactionMsgs.length > 0 || stressorMsgs.length > 0 || supportMsgs.length > 0;

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-5 py-2 rounded-full text-sm font-semibold">
          <BarChart3 size={16} />
          <span>ストレスチェック結果</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
          {result.periodTitle}
        </h1>
        <p className="text-gray-500 text-sm">回答日: {answeredDate}</p>
      </div>

      {/* 高ストレス判定 */}
      {result.isHighStress ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-800">高ストレス者に該当します</h2>
              <p className="text-sm text-red-600">厚生労働省の基準に基づき、高ストレスと判定されました。</p>
            </div>
          </div>
          <p className="text-sm text-red-700 leading-relaxed">
            産業医による面接指導を受けることができます。ご希望の場合は、人事部門にお申し出ください。
            面接指導は労働者の申出により行われ、申出を理由とした不利益な取り扱いは法律で禁止されています。
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-800">高ストレスには該当しません</h2>
              <p className="text-sm text-emerald-600">大きなストレスの傾向は見られません。引き続きセルフケアを心がけましょう。</p>
            </div>
          </div>
        </div>
      )}

      {/* ストレス状況の概要 */}
      <div className={`rounded-2xl border ${overallStatus.border} ${overallStatus.bg} p-6`}>
        <div className="flex items-center gap-3 mb-3">
          <StatusIcon className={`h-5 w-5 ${overallStatus.color}`} />
          <h2 className="text-base font-bold text-gray-900">
            ストレス状況: <span className={overallStatus.color}>{overallStatus.label}</span>
            <span className="text-xs font-normal text-gray-500 ml-2">（平均評価点: {overallAvg} / 5.0）</span>
          </h2>
        </div>
        <p className="text-sm text-gray-700">{overallStatus.description}</p>
      </div>

      {/* 具体的な指摘事項 */}
      {hasConcerns && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            注意が必要な項目
          </h2>

          {/* ストレス反応 */}
          {reactionMsgs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                <HeartPulse className="h-4 w-4" />
                心身のストレス反応
              </h3>
              <ul className="space-y-1.5 ml-6">
                {reactionMsgs.map((msg, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-rose-400 mt-1.5">•</span>
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ストレッサー */}
          {stressorMsgs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-blue-700 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                ストレスの原因（ストレッサー）
              </h3>
              <ul className="space-y-1.5 ml-6">
                {stressorMsgs.map((msg, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-400 mt-1.5">•</span>
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* サポート不足 */}
          {supportMsgs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-2">
                <Users className="h-4 w-4" />
                サポート・満足度
              </h3>
              <ul className="space-y-1.5 ml-6">
                {supportMsgs.map((msg, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-emerald-400 mt-1.5">•</span>
                    <span>{msg}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 問題なしメッセージ */}
      {!hasConcerns && !result.isHighStress && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-sm text-gray-700">
            すべての尺度で特に懸念される項目はありませんでした。
            現在の良い状態を維持するために、セルフケアを引き続き心がけてください。
          </p>
        </div>
      )}
    </div>
  );
}
