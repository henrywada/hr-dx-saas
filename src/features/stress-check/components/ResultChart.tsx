'use client';

import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  Brain,
  HeartPulse,
  Users,
  ShieldCheck,
} from 'lucide-react';
import type { ScaleScore, StressCheckResultData } from '../queries';

// ============================================================
// 厚労省マニュアル準拠 3グラフの尺度振り分け
// ============================================================

/** グラフ①: ストレスの原因と考えられる因子（カテゴリA系） */
const CHART1_KEYWORDS = [
  '仕事の負担', '負担（量）', '負担（質）', '身体的負担',
  '対人関係', '職場環境', 'コントロール', '技能の活用',
  '適性度', '適正度', '働きがい',
];

/** グラフ②: ストレスによって起こる心身の反応（カテゴリB系） */
const CHART2_KEYWORDS = [
  '活気', 'イライラ', '疲労', '不安', '抑うつ', '身体愁訴',
];

/** グラフ③: ストレス反応に影響を与える他の因子（カテゴリC+D系） */
const CHART3_KEYWORDS = [
  '上司', '同僚', '家族', '友人', '満足',
];

function matchesGroup(scaleName: string, keywords: string[]): boolean {
  return keywords.some((kw) => scaleName.includes(kw));
}

function groupScaleScores(scaleScores: ScaleScore[]) {
  const chart1: ScaleScore[] = [];
  const chart2: ScaleScore[] = [];
  const chart3: ScaleScore[] = [];
  const unmatched: ScaleScore[] = [];

  for (const s of scaleScores) {
    if (matchesGroup(s.scaleName, CHART1_KEYWORDS)) {
      chart1.push(s);
    } else if (matchesGroup(s.scaleName, CHART2_KEYWORDS)) {
      chart2.push(s);
    } else if (matchesGroup(s.scaleName, CHART3_KEYWORDS)) {
      chart3.push(s);
    } else {
      // カテゴリでフォールバック
      if (s.category === 'A') chart1.push(s);
      else if (s.category === 'B') chart2.push(s);
      else chart3.push(s);
    }
  }

  return { chart1, chart2, chart3, unmatched };
}

// 短縮ラベル生成（レーダー軸用に短く表示）
function shortenLabel(scaleName: string): string {
  return scaleName
    .replace('心理的な仕事の負担（量）', '仕事の量')
    .replace('心理的な仕事の負担（質）', '仕事の質')
    .replace('自覚的な身体的負担度', '身体的負担')
    .replace('職場の対人関係でのストレス', '対人関係')
    .replace('職場環境によるストレス', '職場環境')
    .replace('仕事のコントロール度', 'コントロール')
    .replace('あなたの技能の活用度', '技能活用')
    .replace('あなたが感じている仕事の適性度', '仕事の適性')
    .replace('あなたが感じている仕事の適正度', '仕事の適性')
    .replace('上司からのサポート', '上司支援')
    .replace('同僚からのサポート', '同僚支援')
    .replace('家族や友人からのサポート', '家族・友人')
    .replace('仕事や生活の満足度', '満足度')
    .replace(/^(.{8}).+$/, '$1…');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-4 py-3 text-sm z-50">
      <p className="font-bold text-gray-900">{d.fullLabel}</p>
      <p className="text-gray-600 mt-1">
        評価点: <span className="font-semibold text-indigo-600">{d.value} / 5.0</span>
      </p>
      <p className="text-gray-500 text-xs mt-0.5">
        素点: {d.rawScore} &nbsp;（{d.questionCount}問）
      </p>
    </div>
  );
}

// ============================================================
// チャートカード共通コンポーネント
// ============================================================
interface ChartCardProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  data: ScaleScore[];
  strokeColor: string;
  fillColor: string;
}

function ChartCard({ title, subtitle, icon: Icon, gradient, data, strokeColor, fillColor }: ChartCardProps) {
  if (data.length === 0) return null;

  const radarData = data.map((s) => ({
    subject: shortenLabel(s.scaleName),
    fullLabel: s.scaleName,
    value: s.evalPoint,
    rawScore: s.rawScore,
    questionCount: s.questionCount,
  }));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* ヘッダー */}
      <div className={`bg-gradient-to-r ${gradient} px-6 py-4`}>
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-white/90" />
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="text-xs text-white/70">{subtitle}</p>
          </div>
        </div>
      </div>

      {/* チャート */}
      <div className="p-4 md:p-6">
        <div className="w-full flex justify-center">
          <ResponsiveContainer width="100%" height={380}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: '#374151', fontSize: 11, fontWeight: 500 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 5]}
                tickCount={6}
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="あなたのスコア"
                dataKey="value"
                stroke={strokeColor}
                fill={fillColor}
                fillOpacity={0.2}
                strokeWidth={2.5}
                dot={{ r: 4, fill: strokeColor, stroke: '#fff', strokeWidth: 2 }}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 尺度一覧テーブル */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">尺度</th>
                <th className="text-center py-2 px-2 text-gray-500 font-medium w-20">評価点</th>
                <th className="text-left py-2 px-2 text-gray-500 font-medium w-32">レベル</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => {
                const level = getEvalLevel(s.evalPoint);
                return (
                  <tr key={s.scaleName} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2.5 px-3 text-gray-800 font-medium">{s.scaleName}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="font-bold text-gray-900">{s.evalPoint}</span>
                      <span className="text-gray-400 text-xs"> / 5</span>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${level.barColor}`}
                            style={{ width: `${(s.evalPoint / 5) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium whitespace-nowrap ${level.textColor}`}>
                          {level.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getEvalLevel(evalPoint: number): { label: string; textColor: string; barColor: string } {
  if (evalPoint <= 1.5) return { label: '非常に低い', textColor: 'text-emerald-600', barColor: 'bg-emerald-400' };
  if (evalPoint <= 2.5) return { label: '低い', textColor: 'text-teal-600', barColor: 'bg-teal-400' };
  if (evalPoint <= 3.5) return { label: '普通', textColor: 'text-amber-600', barColor: 'bg-amber-400' };
  if (evalPoint <= 4.2) return { label: 'やや高い', textColor: 'text-orange-600', barColor: 'bg-orange-400' };
  return { label: '高い', textColor: 'text-red-600', barColor: 'bg-red-500' };
}

// ============================================================
// メインコンポーネント
// ============================================================
interface ResultChartProps {
  result: StressCheckResultData;
}

export default function ResultChart({ result }: ResultChartProps) {
  const { chart1, chart2, chart3 } = groupScaleScores(result.scaleScores);

  return (
    <div className="space-y-6">
      {/* 注釈 */}
      <div className="flex items-start gap-2 p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-800">
        <ShieldCheck className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">厚生労働省「職業性ストレス簡易調査票」準拠</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            各尺度の評価点（1〜5点）がレーダーチャートで表示されています。中心（1点）が最も良好、外側（5点）が最も負荷が高いことを意味します。
          </p>
        </div>
      </div>

      {/* グラフ①: ストレスの原因 */}
      <ChartCard
        title="A. ストレスの原因と考えられる因子"
        subtitle="仕事の量・質・裁量度・対人関係・環境などの要因"
        icon={Brain}
        gradient="from-blue-500 to-indigo-600"
        data={chart1}
        strokeColor="#4f46e5"
        fillColor="#6366f1"
      />

      {/* グラフ②: 心身の反応 */}
      <ChartCard
        title="B. ストレスによって起こる心身の反応"
        subtitle="活気・イライラ・疲労・不安・抑うつ・身体愁訴"
        icon={HeartPulse}
        gradient="from-rose-500 to-pink-600"
        data={chart2}
        strokeColor="#e11d48"
        fillColor="#f43f5e"
      />

      {/* グラフ③: サポート因子 */}
      <ChartCard
        title="C. ストレス反応に影響を与える他の因子"
        subtitle="上司・同僚・家族からのサポート、仕事・生活の満足度"
        icon={Users}
        gradient="from-emerald-500 to-teal-600"
        data={chart3}
        strokeColor="#059669"
        fillColor="#10b981"
      />
    </div>
  );
}
