"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, Users, Sparkles } from "lucide-react";

interface AnalyticsData {
  trend: { date: string; score: number }[];
  themes: { subject: string; score: number; fullMark: number }[];
  metrics: { engagementScore: string; responseCount: number };
}

interface ManagerDashboardAnalyticsProps {
  analytics: AnalyticsData | null;
}

export function ManagerDashboardAnalytics({ analytics }: ManagerDashboardAnalyticsProps) {
  if (!analytics) {
    return (
      <div className="bg-white p-6 rounded-xl border text-center text-gray-500">
        データが取得できませんでした
      </div>
    );
  }

  const { trend, themes, metrics } = analytics;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-purple-600" />
        <h2 className="text-xl font-bold text-gray-800">アナリティクス & トレンド</h2>
      </div>

      {/* 1. Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均エンゲージメント</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.engagementScore}</div>
            <p className="text-xs text-gray-500 mt-1">
              全期間の平均スコア
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">回答数</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{metrics.responseCount}</div>
            <p className="text-xs text-gray-500 mt-1">
              直近30日間の回答総数
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 2. Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Trend Line Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">全社スコア推移 (直近30日)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9CA3AF" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    domain={[0, 5]} 
                    stroke="#9CA3AF" 
                    fontSize={12} 
                    tickLine={false}
                    axisLine={false}
                    tickCount={6}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#8B5CF6" 
                    strokeWidth={3} 
                    dot={{ fill: "#8B5CF6", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Right: Theme Radar Chart */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="text-base">テーマ別平均スコア</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
                {themes.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={themes}>
                        <PolarGrid stroke="#E5E7EB" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#4B5563", fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                        <Radar
                            name="Score"
                            dataKey="score"
                            stroke="#F97316"
                            fill="#F97316"
                            fillOpacity={0.6}
                        />
                        <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-gray-400 text-sm">データが不足しています</div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
