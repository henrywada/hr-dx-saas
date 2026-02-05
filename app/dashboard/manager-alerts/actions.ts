// app/dashboard/manager-alerts/actions.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import {
    analyzeEmployeeCondition,
    type PulseSession,
} from "@/lib/ai-analysis-engine";

// AIAnalysis型を直接定義（"use server"ファイルではre-exportが機能しないため）
export interface AIAnalysis {
    severity: "critical" | "warning" | "attention";
    statusMessage: string;
    detailedAnalysis: string;
    suggestions: string[];
    conversationHints: string[];
    trendAnalysis: {
        pattern: "declining" | "stable_low" | "volatile" | "improving";
        description: string;
    };
}

export interface PulseSessionWithIntent {
    id: string;
    overall_score: number;
    feedback_comment: string | null;
    created_at: string;
    intent_id: string;
    pulse_intents: {
        id: string;
        label: string;
    } | null;
    manager_comment?: string | null;
}

export interface ManagerAlert {
    employee: {
        id: string;
        name: string;
        division_id?: string;
        group_name?: string;
    };
    latestAlert: {
        id: string;
        calculated_score: number;
        created_at: string;
        intent_label: string;
    };
    analysis: AIAnalysis;
}

/**
 * マネージャー用アラート一覧を取得
 * 自分が管理する部下のアラートのみを返す
 */
export async function getManagerAlerts(): Promise<ManagerAlert[]> {
    const supabase = await createClient();

    // 1. ログインユーザー取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("ユーザーが見つかりません");
    }

    // 2. 従業員情報とマネージャーフラグを確認
    const { data: manager, error: managerError } = await supabase
        .from("employees")
        .select("id, tenant_id, division_id, group_name, is_manager")
        .eq("id", user.id)
        .single();

    if (managerError || !manager) {
        throw new Error("従業員情報の取得に失敗しました");
    }

    if (!manager.is_manager) {
        // マネージャーでない場合は空配列を返す
        return [];
    }

    // 3. マネージャーの部署情報取得
    const { data: managerDivision } = await supabase
        .from("divisions")
        .select("id, parent_id")
        .eq("id", manager.division_id || "")
        .single();

    // 4. 同じdivisionまたは親部署配下の従業員を取得
    let subordinatesQuery = supabase
        .from("employees")
        .select("id, name, division_id, group_name")
        .eq("tenant_id", manager.tenant_id)
        .neq("id", manager.id); // 自分自身は除外

    // 同じdivision_idまたは同じgroup_nameの従業員をフィルタ
    if (manager.division_id) {
        subordinatesQuery = subordinatesQuery.or(
            `division_id.eq.${manager.division_id},group_name.eq.${
                manager.group_name || ""
            }`,
        );
    }

    const { data: subordinates, error: subordinatesError } =
        await subordinatesQuery;

    if (subordinatesError || !subordinates || subordinates.length === 0) {
        return [];
    }

    const subordinateIds = subordinates.map((s) => s.id);

    // 5. 各部下の最新アラートを取得（status='pending'のみ）
    const { data: alerts, error: alertsError } = await supabase
        .from("pulse_alerts")
        .select(`
      id,
      employee_id,
      calculated_score,
      created_at,
      status,
      pulse_intents (
        id,
        label
      )
    `)
        .in("employee_id", subordinateIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (alertsError) {
        console.error("アラート取得エラー:", alertsError);
        return [];
    }

    if (!alerts || alerts.length === 0) {
        return [];
    }

    // 6. 従業員ごとに最新アラートのみを抽出
    const latestAlertsByEmployee = new Map<string, any>();
    for (const alert of alerts) {
        if (!latestAlertsByEmployee.has(alert.employee_id)) {
            latestAlertsByEmployee.set(alert.employee_id, alert);
        }
    }

    // 7. 各従業員のセッション履歴を取得してAI分析
    const managerAlerts: ManagerAlert[] = [];

    for (const [employeeId, alert] of latestAlertsByEmployee.entries()) {
        const employee = subordinates.find((s) => s.id === employeeId);
        if (!employee) continue;

        // セッション履歴を取得（最新10件）
        const { data: sessions } = await supabase
            .from("pulse_sessions")
            .select(`
        id,
        overall_score,
        created_at,
        feedback_comment,
        intent_id,
        pulse_intents (
          id,
          label
        )
      `)
            .eq("employee_id", employeeId)
            .order("created_at", { ascending: false })
            .limit(10);

        // AI分析実行
        const mappedSessions: PulseSession[] = (sessions || []).map((s) => ({
            ...s,
            pulse_intents:
                Array.isArray(s.pulse_intents) && s.pulse_intents.length > 0
                    ? s.pulse_intents[0]
                    : undefined,
        }));
        const analysis = analyzeEmployeeCondition(
            mappedSessions,
            employee,
        );

        managerAlerts.push({
            employee,
            latestAlert: {
                id: alert.id,
                calculated_score: alert.calculated_score,
                created_at: alert.created_at,
                intent_label: alert.pulse_intents?.label || "",
            },
            analysis,
        });
    }

    // 深刻度順でソート
    const severityOrder = { critical: 0, warning: 1, attention: 2 };
    managerAlerts.sort((a, b) =>
        severityOrder[a.analysis.severity] - severityOrder[b.analysis.severity]
    );

    return managerAlerts;
}

/**
 * 従業員のパルス履歴を取得
 */
export async function getEmployeePulseHistory(
    employeeId: string,
): Promise<PulseSessionWithIntent[]> {
    const supabase = await createClient();

    // 1. ログインユーザーがマネージャーか確認
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("ユーザーが見つかりません");
    }

    const { data: manager } = await supabase
        .from("employees")
        .select("is_manager, tenant_id")
        .eq("id", user.id)
        .single();

    if (!manager?.is_manager) {
        throw new Error("権限がありません");
    }

    // 2. セッション履歴を取得
    const { data: sessions, error } = await supabase
        .from("pulse_sessions")
        .select(`
      id,
      overall_score,
      feedback_comment,
      created_at,
      intent_id,
      pulse_intents (

        id,
        label
      )
    `)
        .eq("employee_id", employeeId)
        .eq("tenant_id", manager.tenant_id)
        .order("created_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("セッション履歴取得エラー:", error);
        throw new Error("セッション履歴の取得に失敗しました");
    }

    // 3. 各セッションの上司コメントを取得
    const sessionIds = sessions?.map((s) => s.id) || [];
    const { data: comments } = await supabase
        .from("manager_comments")
        .select("*")
        .in("session_id", sessionIds);

    // セッションにコメントをマージ & pulse_intentsを配列から単一オブジェクトに変換
    const sessionsWithComments: PulseSessionWithIntent[] =
        sessions?.map((session: any) => {
            const convertedIntents = Array.isArray(session.pulse_intents)
                ? session.pulse_intents[0] || null
                : session.pulse_intents;

            return {
                ...session,
                pulse_intents: convertedIntents,
                manager_comment: comments?.find((c) =>
                    c.session_id === session.id
                )?.comment || null,
            };
        }) || [];

    return sessionsWithComments;
}

/**
 * 上司コメントを保存または更新
 */
export async function saveManagerComment(sessionId: string, comment: string) {
    const supabase = await createClient();

    // 1. ログインユーザー取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        throw new Error("ユーザーが見つかりません");
    }

    const { data: manager } = await supabase
        .from("employees")
        .select("id, tenant_id, is_manager")
        .eq("id", user.id)
        .single();

    if (!manager?.is_manager) {
        throw new Error("権限がありません");
    }

    // 2. セッション情報を取得してtenant_idを確認
    const { data: session } = await supabase
        .from("pulse_sessions")
        .select("tenant_id")
        .eq("id", sessionId)
        .single();

    if (!session || session.tenant_id !== manager.tenant_id) {
        throw new Error("セッションが見つかりません");
    }

    // 3. 既存のコメントがあるか確認
    const { data: existingComment } = await supabase
        .from("manager_comments")
        .select("id")
        .eq("session_id", sessionId)
        .eq("manager_id", manager.id)
        .single();

    if (existingComment) {
        // 更新
        const { error } = await supabase
            .from("manager_comments")
            .update({
                comment,
                updated_at: new Date().toISOString(),
            })
            .eq("id", existingComment.id);

        if (error) {
            console.error("コメント更新エラー:", error);
            throw new Error("コメントの更新に失敗しました");
        }
    } else {
        // 新規作成
        const { error } = await supabase
            .from("manager_comments")
            .insert({
                tenant_id: manager.tenant_id,
                session_id: sessionId,
                manager_id: manager.id,
                comment,
            });

        if (error) {
            console.error("コメント作成エラー:", error);
            throw new Error("コメントの作成に失敗しました");
        }
    }

    return { success: true };
}

/**
 * 従業員のAI分析結果を取得
 */
export async function getAIAnalysisForEmployee(
    employeeId: string,
): Promise<AIAnalysis> {
    const supabase = await createClient();

    // セッション履歴を取得
    const sessions = await getEmployeePulseHistory(employeeId);

    // 従業員情報を取得
    const { data: employee } = await supabase
        .from("employees")
        .select("id, name, division_id, group_name")
        .eq("id", employeeId)
        .single();

    if (!employee) {
        throw new Error("従業員が見つかりません");
    }

    // AI分析実行
    const mappedSessions: PulseSession[] = (sessions || []).map((s) => ({
        ...s,
        pulse_intents:
            Array.isArray(s.pulse_intents) && s.pulse_intents.length > 0
                ? s.pulse_intents[0]
                : undefined,
    }));
    return analyzeEmployeeCondition(mappedSessions, employee);
}
