"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface PulseThemeStats {
    averageScore: number | null;
    lastExecuted: string | null;
    responseCount: number;
    alertCount: number;
    recentAlertTrend: "increasing" | "stable" | "decreasing";
}

export interface PulseTheme {
    id: string;
    label: string;
    objective: string;
    description: string;
    usage_tips: string;
    alarm_threshold: number;
    stats: PulseThemeStats;
    isActive: boolean;
    isRecommended: boolean; // おすすめフラグ
}

/**
 * 利用可能なテーマ一覧を取得（統計情報とおすすめロジック含む）
 */
export async function getAvailableThemes(): Promise<PulseTheme[]> {
    const supabase = await createClient();

    // 1. ユーザーのテナントID取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    const { data: employee } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee) throw new Error("Employee not found");

    // 2. アクティブなテーマID一覧を取得
    const { data: config } = await supabase
        .from("pulse_configs")
        .select("active_theme_ids")
        .eq("tenant_id", employee.tenant_id)
        .maybeSingle();

    const activeThemeIds: string[] = config?.active_theme_ids || [];

    // 3. 全テーマ取得
    const { data: intents, error } = await supabase
        .from("pulse_intents")
        .select(`
            id,
            label,
            objective,
            description,
            usage_tips,
            alarm_threshold
        `);

    if (error) {
        console.error("Failed to fetch intents:", error);
        throw new Error("テーマの取得に失敗しました");
    }

    if (!intents || intents.length === 0) {
        return [];
    }

    // 4. 各テーマの統計を計算
    const themesWithStats = await Promise.all(
        intents.map(async (intent) => {
            // 4-1. 最近10件のセッション取得
            const { data: sessions } = await supabase
                .from("pulse_sessions")
                .select("overall_score, created_at")
                .eq("intent_id", intent.id)
                .eq("tenant_id", employee.tenant_id)
                .order("created_at", { ascending: false })
                .limit(10);

            const averageScore = sessions?.length
                ? sessions.reduce((sum, s) => sum + s.overall_score, 0) /
                    sessions.length
                : null;

            const lastExecuted = sessions?.[0]?.created_at || null;

            // 4-2. 未対応アラート数
            const { count: alertCount } = await supabase
                .from("pulse_alerts")
                .select("*", { count: "exact", head: true })
                .eq("intent_id", intent.id)
                .eq("tenant_id", employee.tenant_id)
                .eq("status", "pending");

            // 4-3. 最近7日間のアラート数（トレンド判定）
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { count: recentAlertCount } = await supabase
                .from("pulse_alerts")
                .select("*", { count: "exact", head: true })
                .eq("intent_id", intent.id)
                .eq("tenant_id", employee.tenant_id)
                .gte("created_at", sevenDaysAgo.toISOString());

            // トレンド判定
            let recentAlertTrend: "increasing" | "stable" | "decreasing" =
                "stable";
            if (recentAlertCount && recentAlertCount > 3) {
                recentAlertTrend = "increasing";
            } else if (recentAlertCount === 0) {
                recentAlertTrend = "decreasing";
            }

            // 4-4. おすすめ判定ロジック
            const isRecommended = recentAlertTrend === "increasing" ||
                (averageScore !== null &&
                    averageScore < intent.alarm_threshold) ||
                (alertCount !== null && alertCount >= 3);

            // 4-5. アクティブ状態の判定
            const isActive = activeThemeIds.includes(intent.id);

            return {
                id: intent.id,
                label: intent.label,
                objective: intent.objective,
                description: intent.description,
                usage_tips: intent.usage_tips,
                alarm_threshold: intent.alarm_threshold,
                stats: {
                    averageScore,
                    lastExecuted,
                    responseCount: sessions?.length || 0,
                    alertCount: alertCount || 0,
                    recentAlertTrend,
                },
                isActive,
                isRecommended,
            };
        }),
    );

    // おすすめ順にソート（おすすめ > アラート数 > 平均スコア）
    return themesWithStats.sort((a, b) => {
        if (a.isRecommended && !b.isRecommended) return -1;
        if (!a.isRecommended && b.isRecommended) return 1;

        // アラート数で比較
        const alertDiff = (b.stats.alertCount || 0) - (a.stats.alertCount || 0);
        if (alertDiff !== 0) return alertDiff;

        // 平均スコアで比較（低い方を優先）
        const aScore = a.stats.averageScore ?? 5;
        const bScore = b.stats.averageScore ?? 5;
        return aScore - bScore;
    });
}

/**
 * アクティブなテーマを更新
 */
export async function updateActiveThemes(themeIds: string[]) {
    const supabase = await createClient();

    // ユーザーのテナントID取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    const { data: employee } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee) throw new Error("Employee not found");

    console.log("🔍 [updateActiveThemes] Tenant ID:", employee.tenant_id);
    console.log("🔍 [updateActiveThemes] Theme IDs:", themeIds);

    // 既存のレコードを確認
    const { data: existingConfig } = await supabase
        .from("pulse_configs")
        .select("id")
        .eq("tenant_id", employee.tenant_id)
        .maybeSingle();

    let data, error;

    if (existingConfig) {
        // 既存レコードを更新
        const result = await supabase
            .from("pulse_configs")
            .update({
                active_theme_ids: themeIds,
            })
            .eq("tenant_id", employee.tenant_id)
            .select();

        data = result.data;
        error = result.error;
    } else {
        // 新規レコードを挿入
        const result = await supabase
            .from("pulse_configs")
            .insert({
                tenant_id: employee.tenant_id,
                active_theme_ids: themeIds,
            })
            .select();

        data = result.data;
        error = result.error;
    }

    if (error) {
        console.error("❌ [updateActiveThemes] Error details:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
        });
        throw new Error(`テーマの保存に失敗しました: ${error.message}`);
    }

    console.log("✅ [updateActiveThemes] Successfully saved:", data);

    revalidatePath("/dashboard/settings/pulse/themes");

    return {
        success: true,
        message: `${themeIds.length}個のテーマを選択しました`,
    };
}
