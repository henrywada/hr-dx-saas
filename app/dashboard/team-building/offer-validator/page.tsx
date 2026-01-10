"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, ArrowLeft, Search, TrendingUp, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface DiagnosisResult {
  score: "A" | "B" | "C";
  market_avg_min: number;
  market_avg_max: number;
  advice: string;
  competitor_trend: string;
  effective_media?: { name: string; url: string }[];
}

export default function OfferValidatorPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const supabase = createClient();

  const handleDiagnose = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData(e.currentTarget);

    // フォームデータの収集
    const payload = {
      role: formData.get("role"),
      location: formData.get("location"),
      level: level, // Stateから取得
      salary_min: Number(formData.get("salary_min")),
      salary_max: Number(formData.get("salary_max")),
      tags: selectedTags, // Stateから取得
    };

    try {
      // const { data, error } = await supabase.functions.invoke('analyze-offer', {
      //   body: payload
      //  });
      // --- 修正後（以下に書き換えてください） ---
      const response = await fetch('/api/analyze-offer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '診断に失敗しました');
      }

      // --- 修正はここまで ---

      setResult(data);

    } catch (err) {
      console.error(err);
      setError("診断中にエラーが発生しました。しばらく経ってから再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  // SelectとTagsのためのState管理
  const [level, setLevel] = useState("middle");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };



  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ナビゲーション */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/team-building" className="hover:text-primary transition-colors flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          Back to 人事・採用支援
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-blue-600" />
          <h1 className="text-3xl font-bold tracking-tight">オファー妥当性診断</h1>
        </div>
        <p className="text-muted-foreground">
          市場相場と照合し、あなたのオファーが「勝てる条件」か診断します。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* 左側：入力フォーム */}
        <Card className="shadow-md h-fit">
          <CardHeader>
            <CardTitle>求人条件を入力</CardTitle>
            <CardDescription>
              診断したい職種と条件を入力してください。
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleDiagnose}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">職種名 <span className="text-red-500">*</span></Label>
                <Input id="role" name="role" placeholder="例: フロントエンドエンジニア" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">勤務地 (市区町村) <span className="text-red-500">*</span></Label>
                <Input id="location" name="location" placeholder="例: 神奈川県座間市" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">想定レベル</Label>
                <Select value={level} onValueChange={setLevel} name="level">
                  <SelectTrigger>
                    <SelectValue placeholder="レベルを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior (実務未経験〜3年)</SelectItem>
                    <SelectItem value="middle">Middle (3年〜リーダー候補)</SelectItem>
                    <SelectItem value="senior">Senior (マネージャークラス)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary_min">年収下限 (万円)</Label>
                  <Input id="salary_min" name="salary_min" type="number" placeholder="400" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary_max">年収上限 (万円)</Label>
                  <Input id="salary_max" name="salary_max" type="number" placeholder="600" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>特徴・タグ (任意)</Label>
                <div className="flex flex-wrap gap-2">
                  {["リモート可", "フレックス", "副業可", "退職金あり", "未経験可"].map((tag) => (
                    <div
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`flex items-center space-x-2 rounded-md border p-2 text-sm cursor-pointer transition-colors ${selectedTags.includes(tag) ? "bg-blue-50 border-blue-200 text-blue-700" : "hover:bg-accent"
                        }`}
                    >
                      <div className={`h-4 w-4 rounded border flex items-center justify-center ${selectedTags.includes(tag) ? "bg-primary border-primary" : "border-gray-300"
                        }`}>
                        {selectedTags.includes(tag) && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                      <label className="cursor-pointer select-none">{tag}</label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    市場データを分析中...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    この条件で診断する
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* 右側：診断結果エリア */}
        <div className="space-y-4">
          {/* 初期表示：メリットの訴求 */}
          {!result && !loading && !error && (
            <Card className="bg-blue-50/50 border-blue-100 h-full">
              <CardHeader>
                <CardTitle className="text-lg text-blue-800">Why Validate?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-700 space-y-4">
                <p>求職者の<span className="font-bold">8割</span>は、まず「給与」と「勤務地」でフィルタリングします。</p>
                <p>相場より低いオファーは、どれだけ熱いスカウト文面を送っても開封されません。</p>
                <div className="pt-2 border-t border-blue-200">
                  <p className="font-semibold mb-1">AIがチェックするポイント:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>近隣エリアの平均年収</li>
                    <li>競合他社の待遇トレンド</li>
                    <li>職種ごとの需給バランス</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* エラー表示 */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <CardTitle className="text-base">エラーが発生しました</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-red-600">
                {error}
              </CardContent>
            </Card>
          )}

          {/* ローディング表示 */}
          {loading && (
            <Card className="h-full">
              <CardHeader>
                <div className="h-6 w-1/2 bg-gray-100 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-full bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <div className="h-32 w-full bg-gray-50 rounded animate-pulse border border-gray-100"></div>
              </CardContent>
            </Card>
          )}

          {/* 診断結果表示 */}
          {result && (
            <Card className={`border-2 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500 ${result.score === 'A' ? 'border-green-500 bg-green-50/30' :
              result.score === 'B' ? 'border-yellow-400 bg-yellow-50/30' :
                'border-red-500 bg-red-50/30'
              }`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>診断結果</CardTitle>
                  {result.score === 'A' && <CheckCircle2 className="h-8 w-8 text-green-600" />}
                  {result.score === 'B' && <AlertTriangle className="h-8 w-8 text-yellow-600" />}
                  {result.score === 'C' && <AlertTriangle className="h-8 w-8 text-red-600" />}
                </div>
                <div className="mt-2">
                  <span className="text-sm text-muted-foreground font-medium">判定スコア:</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-5xl font-extrabold ${result.score === 'A' ? 'text-green-600' :
                      result.score === 'B' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                      {result.score}
                    </span>
                    <span className="text-lg font-medium text-muted-foreground">
                      {result.score === 'A' ? 'Competitive' : result.score === 'B' ? 'Warning' : 'Critical'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-2">
                <div className="p-3 bg-white/50 rounded-lg border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">エリア平均相場</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">
                      {result.market_avg_min}-{result.market_avg_max}
                    </span>
                    <span className="text-sm text-muted-foreground">万円</span>
                  </div>
                </div>

                <div className="text-sm leading-relaxed text-foreground/90">
                  <p className="font-bold mb-1 flex items-center gap-1">
                    💡 AI Advice
                  </p>
                  {result.advice}
                </div>

                {result.effective_media && result.effective_media.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <p className="text-sm font-bold text-foreground">📱 推奨チャネル Top 5</p>
                    <div className="flex flex-wrap gap-2">
                      {result.effective_media.map((media, i) => (
                        <a
                          key={i}
                          href={media.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary hover:bg-primary/20 hover:underline overflow-hidden whitespace-nowrap"
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                            {i + 1}
                          </span>
                          {media.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <span className="font-semibold">Trend:</span> {result.competitor_trend}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full bg-white hover:bg-gray-50" onClick={() => setResult(null)}>
                  条件を修正して再診断
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}