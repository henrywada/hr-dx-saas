"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// フロントエンドから受け取るデータの型定義
interface PulseData {
    score: number;
    category: string;
    comment: string;
}

export async function submitPulseResponse(data: PulseData) {
    const supabase = await createClient();

    // 1. 現在ログインしているユーザーを特定
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    // 2. 従業員情報を取得 (tenant_idが必要なため)
    const { data: employee } = await supabase
        .from("employees")
        .select("id, tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee) throw new Error("Employee record not found");

    // 3. セッション（回答の束）を作成
    const { data: session, error: sessionError } = await supabase
        .from("pulse_sessions")
        .insert({
            tenant_id: employee.tenant_id,
            employee_id: employee.id,
            overall_score: data.score,
        })
        .select()
        .single();

    if (sessionError) {
        console.error("Session Error:", sessionError);
        throw new Error("回答セッションの作成に失敗しました");
    }

    // 4. 個別の回答詳細を保存 (3つの質問に対する答えをまとめて保存)
    const responses = [
        {
            session_id: session.id,
            custom_question_text: "今週のコンディションは？", // 質問文も記録
            answer_value: data.score,
        },
        {
            session_id: session.id,
            custom_question_text: "その理由に近いものは？",
            answer_text: data.category,
        },
        {
            session_id: session.id,
            custom_question_text: "何か伝えたいことは？",
            answer_text: data.comment,
        },
    ];

    const { error: responseError } = await supabase
        .from("pulse_responses")
        .insert(responses);

    if (responseError) {
        console.error("Response Error:", responseError);
        throw new Error("回答詳細の保存に失敗しました");
    }

    // 5. キャッシュ更新 (管理画面などで即反映されるように)
    revalidatePath("/portal");

    return { success: true };
}

// ========================================
// V2: 新アーキテクチャ（パック・意図・質問ベース）
// ========================================

/**
 * デフォルトのパックを取得（初回利用時）
 * @returns デフォルトパックデータ（質問リスト含む）
 */
export async function getDefaultPulsePack() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    const { data: employee } = await supabase
        .from("employees")
        .select("id, tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee) throw new Error("従業員情報が見つかりません");

    console.log(
        "🔍 [getDefaultPulsePack] Current Employee Tenant:",
        employee.tenant_id,
    );

    // 自社のカスタムパック または 公式パック(is_official = true) を取得
    const { data: pack, error } = await supabase
        .from("pulse_packs")
        .select(`
            id,
            name,
            description,
            is_official,
            pulse_intents (
                id,
                label,
                alarm_threshold,
                pulse_questions (
                    id,
                    question_text,
                    question_type,
                    weight,
                    order_index,
                    choices
                )
            )
        `)
        .or(`tenant_id.eq.${employee.tenant_id},is_official.eq.true`)
        .eq("is_active", true)
        .order("is_official", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    console.log("🔍 [getDefaultPulsePack] Query executed");
    console.log("🔍 [getDefaultPulsePack] - pack:", pack);
    console.log("🔍 [getDefaultPulsePack] - error:", error);

    if (error) {
        console.error("❌ Pack fetch error details:", error);
        throw new Error(`パック取得エラー: ${error.message}`);
    }

    if (!pack) {
        console.error("❌ No pack found. Tenant:", employee.tenant_id);
        throw new Error("利用可能なパックが見つかりません");
    }

    // ===== 管理者が選択したテーマを取得 =====
    const { data: config } = await supabase
        .from("pulse_configs")
        .select("active_theme_ids")
        .eq("tenant_id", employee.tenant_id)
        .maybeSingle();

    const activeThemeIds: string[] = config?.active_theme_ids || [];

    console.log("🔍 [getDefaultPulsePack] Active theme IDs:", activeThemeIds);

    let selectedIntent;

    if (activeThemeIds.length > 0) {
        // 選択されたテーマの中から統計ベースで優先順位を決定
        const activeIntents = pack.pulse_intents?.filter((intent: any) =>
            activeThemeIds.includes(intent.id)
        ) || [];

        console.log("🔍 [getDefaultPulsePack] Active intents:", activeIntents);

        if (activeIntents.length > 0) {
            // 各テーマの統計を取得して優先順位を決定
            const intentsWithStats = await Promise.all(
                activeIntents.map(async (intent: any) => {
                    // 最近の平均スコアを取得
                    const { data: sessions } = await supabase
                        .from("pulse_sessions")
                        .select("overall_score")
                        .eq("intent_id", intent.id)
                        .eq("tenant_id", employee.tenant_id)
                        .order("created_at", { ascending: false })
                        .limit(5);

                    const averageScore = sessions?.length
                        ? sessions.reduce((sum, s) =>
                            sum + s.overall_score, 0) / sessions.length
                        : 5; // デフォルトは高スコア（優先度低）

                    // 未対応アラート数
                    const { count: alertCount } = await supabase
                        .from("pulse_alerts")
                        .select("*", { count: "exact", head: true })
                        .eq("intent_id", intent.id)
                        .eq("tenant_id", employee.tenant_id)
                        .eq("status", "pending");

                    return {
                        intent,
                        averageScore,
                        alertCount: alertCount || 0,
                        priority: (5 - averageScore) * 10 +
                            (alertCount || 0) * 5, // スコアが低い＋アラートが多い = 優先度高
                    };
                }),
            );

            // 優先度が高い順にソート
            intentsWithStats.sort((a, b) =>
                b.priority - a.priority
            );

            selectedIntent = intentsWithStats[0].intent;

            console.log(
                "✅ [getDefaultPulsePack] Selected intent by priority:",
                selectedIntent.label,
                "Priority:",
                intentsWithStats[0].priority,
            );
        } else {
            // 選択されたテーマが見つからない場合は最初のテーマを使用
            selectedIntent = pack.pulse_intents?.[0];
            console.log(
                "⚠️ [getDefaultPulsePack] No active intents found, using first intent",
            );
        }
    } else {
        // テーマが選択されていない場合は最初のテーマを使用
        selectedIntent = pack.pulse_intents?.[0];
        console.log(
            "⚠️ [getDefaultPulsePack] No themes selected, using first intent",
        );
    }

    const intent = selectedIntent;

    console.log("🔍 [getDefaultPulsePack] pulse_intents:", pack.pulse_intents);
    console.log("🔍 [getDefaultPulsePack] final selected intent:", intent);

    if (!intent) {
        console.error("❌ No intent found in pack:", pack.id);
        throw new Error("パックに質問データが関連付けられていません");
    }

    if (!intent.pulse_questions || intent.pulse_questions.length === 0) {
        console.error("❌ No questions found in intent:", intent.id);
        throw new Error("質問が設定されていません");
    }

    // 質問をorder_indexでソート
    intent.pulse_questions.sort(
        (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0),
    );

    console.log(
        "✅ [getDefaultPulsePack] Successfully loaded pack:",
        pack.name,
    );
    console.log(
        "✅ [getDefaultPulsePack] Selected theme:",
        intent.label,
    );
    console.log(
        "✅ [getDefaultPulsePack] Questions count:",
        intent.pulse_questions.length,
    );

    return {
        ...pack,
        pulse_intents: intent, // 単一オブジェクトに変換
    };
}

/**
 * 新アーキテクチャでの回答保存（加重平均計算＋アラート生成）
 */
interface NewPulseResponse {
    intentId: string; // pulse_intents.id
    answers: Array<{
        questionId: string;
        answerValue?: number;
        answerText?: string;
    }>;
    feedbackComment?: string; // オプショナルなフィードバックコメント
}

export async function submitPulseResponseV2(data: NewPulseResponse) {
    const supabase = await createClient();

    // 1. ユーザー・従業員情報取得
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not found");

    const { data: employee } = await supabase
        .from("employees")
        .select("id, tenant_id")
        .eq("id", user.id)
        .single();

    if (!employee) throw new Error("Employee not found");

    // 2. Intent情報と質問のweight取得
    const { data: intent } = await supabase
        .from("pulse_intents")
        .select(`
            id,
            label,
            alarm_threshold,
            pulse_questions (id, weight, question_type)
        `)
        .eq("id", data.intentId)
        .single();

    if (!intent) throw new Error("Intent not found");

    // 3. 加重平均スコアの計算
    // 加重平均スコア = Σ(回答値 × 重み) / Σ(重み)
    let weightedSum = 0;
    let totalWeight = 0;

    data.answers.forEach((ans) => {
        const question = intent.pulse_questions.find((q) =>
            q.id === ans.questionId
        );
        if (question && ans.answerValue !== undefined) {
            weightedSum += ans.answerValue * question.weight;
            totalWeight += question.weight;
        }
    });

    const calculatedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

    console.log(
        "📊 [submitPulseResponseV2] Calculated Score:",
        calculatedScore,
    );
    console.log("📊 [submitPulseResponseV2] Inserting session:", {
        tenant_id: employee.tenant_id,
        employee_id: employee.id,
        overall_score: calculatedScore,
        intent_id: data.intentId,
    });

    // 4. セッション作成
    const { data: session, error: sessionError } = await supabase
        .from("pulse_sessions")
        .insert({
            tenant_id: employee.tenant_id,
            employee_id: employee.id,
            overall_score: calculatedScore,
            intent_id: data.intentId,
            feedback_comment: data.feedbackComment || null, // フィードバックコメントを保存
        })
        .select()
        .single();

    if (sessionError) {
        console.error("❌ Session Error Details:");
        console.error("  - Code:", sessionError.code);
        console.error("  - Message:", sessionError.message);
        console.error("  - Details:", sessionError.details);
        console.error("  - Hint:", sessionError.hint);
        console.error("  - Full Error:", JSON.stringify(sessionError, null, 2));
        throw new Error(`セッション作成失敗: ${sessionError.message}`);
    }

    console.log("✅ Session created:", session.id);

    // 5. 個別回答を保存
    const responses = data.answers.map((ans) => ({
        tenant_id: employee.tenant_id, // RLS対応
        session_id: session.id,
        question_id: ans.questionId,
        answer_value: ans.answerValue,
        answer_text: ans.answerText,
    }));

    console.log("📝 [submitPulseResponseV2] Inserting responses:", responses);

    const { error: responseError } = await supabase
        .from("pulse_responses")
        .insert(responses);

    if (responseError) {
        console.error("❌ Response Error Details:");
        console.error("  - Code:", responseError.code);
        console.error("  - Message:", responseError.message);
        console.error("  - Details:", responseError.details);
        console.error(
            "  - Full Error:",
            JSON.stringify(responseError, null, 2),
        );
        throw new Error(`回答保存失敗: ${responseError.message}`);
    }

    console.log("✅ Responses saved");

    // 6. アラート判定・生成
    if (calculatedScore < intent.alarm_threshold) {
        console.log(
            "🚨 [submitPulseResponseV2] Score below threshold, creating alert",
        );

        const { error: alertError } = await supabase.from("pulse_alerts")
            .insert({
                tenant_id: employee.tenant_id,
                employee_id: employee.id,
                session_id: session.id,
                intent_id: data.intentId,
                calculated_score: calculatedScore,
                threshold: intent.alarm_threshold,
                status: "pending",
            });

        if (alertError) {
            console.error("❌ Alert creation error:");
            console.error("  - Code:", alertError.code);
            console.error("  - Message:", alertError.message);
            console.error(
                "  - Full Error:",
                JSON.stringify(alertError, null, 2),
            );
            // アラート生成失敗は致命的ではないので、エラーログのみ
        } else {
            console.log("✅ Alert created");
        }
    } else {
        console.log("✅ Score above threshold, no alert needed");
    }

    revalidatePath("/portal");
    revalidatePath("/dashboard");

    return { success: true, score: calculatedScore, sessionId: session.id };
}

/**
 * セッションにフィードバックコメントを追加
 */
export async function updateSessionFeedbackComment(
    sessionId: string,
    comment: string,
) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("pulse_sessions")
        .update({ feedback_comment: comment })
        .eq("id", sessionId);

    if (error) {
        console.error("❌ Failed to update feedback comment:", error);
        throw new Error("コメントの保存に失敗しました");
    }

    console.log("✅ Feedback comment updated for session:", sessionId);

    return { success: true };
}
