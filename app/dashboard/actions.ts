"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// 1. アラート一覧の取得（未解決のみ）
export async function getRetentionAlerts() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: manager } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!manager) return [];

    // 未解決（is_resolved = false）かつ スコア2以下の回答を取得
    const { data: alerts, error } = await supabase
        .from("pulse_sessions")
        .select(`
      id,
      overall_score,
      created_at,
      employee_id,
      employees ( name, division_id ),
      pulse_responses ( id, answer_text, custom_question_text, answer_value )
    `)
        .eq("tenant_id", manager.tenant_id)
        .lte("overall_score", 2)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Alert Fetch Error:", error);
        return [];
    }

    return alerts.map((alert: any) => {
        const responses = alert.pulse_responses || [];

        // コメント特定
        const commentObj = responses.find((r: any) =>
            r.custom_question_text &&
            r.custom_question_text.includes("伝えたい")
        );
        // 理由特定
        const reasonObj = responses.find((r: any) =>
            r.answer_text &&
            r.id !== commentObj?.id &&
            !r.answer_value
        );

        return {
            id: alert.id,
            employeeId: alert.employee_id,
            name: alert.employees?.name || "不明な従業員",
            score: alert.overall_score,
            date: new Date(alert.created_at).toLocaleDateString("ja-JP"),
            reason: reasonObj?.answer_text || "理由未回答",
            reasonQuestion: reasonObj?.custom_question_text || "",
            comment: commentObj?.answer_text || "",
            commentQuestion: commentObj?.custom_question_text || "",
        };
    });
}

// 2. 特定従業員の過去履歴を取得（グラフ表示用）
export async function getEmployeeHistory(employeeId: string) {
    const supabase = await createClient();

    const { data: history, error } = await supabase
        .from("pulse_sessions")
        .select("created_at, overall_score")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) return [];

    return history
        .map((h: any) => {
            const d = new Date(h.created_at);
            const dateStr = `${
                d.getMonth() + 1
            }/${d.getDate()} ${d.getHours()}:${
                String(d.getMinutes()).padStart(2, "0")
            }`;
            return {
                date: dateStr,
                score: h.overall_score ?? 0,
            };
        })
        .reverse();
}

// 2-2. 特定従業員の対応済み履歴を取得（アクション履歴タブ用）
export async function getEmployeeResolvedHistory(employeeId: string) {
    const supabase = await createClient();

    const { data: history, error } = await supabase
        .from("pulse_sessions")
        .select(`
            id,
            created_at,
            overall_score,
            resolution_note,
            pulse_responses ( id, answer_text, custom_question_text, answer_value )
        `)
        .eq("employee_id", employeeId)
        .eq("is_resolved", true)
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Resolved History Error:", error);
        return [];
    }

    return history.map((h: any) => {
        const responses = h.pulse_responses || [];

        // コメント特定
        const commentObj = responses.find((r: any) =>
            r.custom_question_text &&
            r.custom_question_text.includes("伝えたい")
        );

        // 理由特定
        const reasonObj = responses.find((r: any) =>
            r.answer_text &&
            r.id !== commentObj?.id &&
            !r.answer_value
        );

        const d = new Date(h.created_at);
        const dateStr = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;

        return {
            id: h.id,
            date: dateStr,
            score: h.overall_score ?? 0,
            reason: reasonObj?.answer_text || "未回答",
            comment: commentObj?.answer_text || "",
            resolutionNote: h.resolution_note || "",
        };
    });
}

// 3. アラートを解決済みにする関数（メモ付き）
// ※ここが重複の原因だったので、これ1つだけに統一します
export async function markAlertAsResolved(sessionId: string, note: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("pulse_sessions")
        .update({
            is_resolved: true,
            resolution_note: note,
        })
        .eq("id", sessionId);

    if (error) {
        console.error("Resolve Error:", error);
        throw new Error("Failed to resolve alert");
    }

    revalidatePath("/dashboard");
    return { success: true };
}
