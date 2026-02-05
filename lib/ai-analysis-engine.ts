// lib/ai-analysis-engine.ts
/**
 * AI分析エンジン
 * 従業員のパルススコア推移を分析し、状況に応じた分析結果を生成
 */

export interface PulseSession {
    id: string;
    overall_score: number;
    created_at: string;
    feedback_comment?: string;
    intent_id: string;
    pulse_intents?: {
        id: string;
        label: string;
    };
}

export interface Employee {
    id: string;
    name: string;
    division_id?: string;
    group_name?: string;
}

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

/**
 * スコア推移パターンを検出
 */
export function detectTrendPattern(
    scores: number[],
): "declining" | "stable_low" | "volatile" | "improving" {
    if (scores.length < 2) return "stable_low";

    const latest = scores[0];
    const previous = scores.slice(1);

    // 急激な低下チェック（前回比-1.5以上）
    if (previous.length > 0 && previous[0] - latest >= 1.5) {
        return "declining";
    }

    // 継続的な低下チェック（3回連続で低下）
    if (scores.length >= 3) {
        const isDecreasing = scores.slice(0, 3).every((score, i) =>
            i === 0 || score < scores[i - 1]
        );
        if (isDecreasing) return "declining";
    }

    // 長期低迷チェック（過去5回のうち4回以上が3.0未満）
    if (scores.length >= 5) {
        const lowScores = scores.slice(0, 5).filter((s) => s < 3.0).length;
        if (lowScores >= 4) return "stable_low";
    }

    // 不安定パターン（高低差が大きい）
    if (scores.length >= 3) {
        const max = Math.max(...scores.slice(0, 3));
        const min = Math.min(...scores.slice(0, 3));
        if (max - min >= 2.0) return "volatile";
    }

    // 改善傾向
    if (scores.length >= 2 && latest > previous[0]) {
        return "improving";
    }

    return "stable_low";
}

/**
 * スコアの深刻度を判定
 */
function getSeverity(
    score: number,
    pattern: string,
): "critical" | "warning" | "attention" {
    if (score <= 2.0 || pattern === "declining") {
        return "critical";
    } else if (score <= 3.0 || pattern === "stable_low") {
        return "warning";
    }
    return "attention";
}

/**
 * パターン別の説明文を生成
 */
function getPatternDescription(pattern: string, scores: number[]): string {
    const latest = scores[0];
    const previous = scores[1] || 0;

    switch (pattern) {
        case "declining":
            const drop = previous - latest;
            return `前回のスコア${previous.toFixed(1)}から今回${
                latest.toFixed(1)
            }へと${drop >= 1.5 ? "急激に" : ""}低下しています。`;

        case "stable_low":
            const lowCount = scores.filter((s) => s < 3.0).length;
            return `過去${scores.length}回のうち${lowCount}回が3.0未満のスコアとなっており、長期的な低迷が見られます。`;

        case "volatile":
            const max = Math.max(...scores);
            const min = Math.min(...scores);
            return `スコアが${min.toFixed(1)}～${
                max.toFixed(1)
            }の間で大きく変動しており、不安定な状態です。`;

        case "improving":
            return `前回から改善傾向が見られますが、引き続き注視が必要です。`;

        default:
            return `現在のスコアは${latest.toFixed(1)}です。`;
    }
}

/**
 * テーマ固有の分析を追加
 */
function getThemeSpecificAnalysis(theme: string, score: number): string {
    if (!theme) return "";

    const themeLower = theme.toLowerCase();

    if (themeLower.includes("離職") || themeLower.includes("turnover")) {
        if (score <= 2.5) {
            return "「離職リスク」テーマでのスコア低下は特に注意が必要です。早急な介入が推奨されます。";
        }
    }

    if (
        themeLower.includes("心理的安全性") ||
        themeLower.includes("psychological safety")
    ) {
        if (score <= 3.0) {
            return "心理的安全性の低下はチーム全体のパフォーマンスにも影響します。環境改善を検討してください。";
        }
    }

    if (
        themeLower.includes("ワークライフバランス") ||
        themeLower.includes("work-life")
    ) {
        if (score <= 3.0) {
            return "業務負荷が過大になっている可能性があります。業務量の見直しを検討してください。";
        }
    }

    return "";
}

/**
 * フィードバックコメントからネガティブキーワードを検出
 */
function analyzeComments(sessions: PulseSession[]): string {
    const negativeKeywords = [
        "疲れ",
        "辛い",
        "辞め",
        "限界",
        "無理",
        "つらい",
        "きつい",
        "大変",
    ];

    for (const session of sessions) {
        if (session.feedback_comment) {
            const hasNegative = negativeKeywords.some((keyword) =>
                session.feedback_comment!.includes(keyword)
            );
            if (hasNegative) {
                return "従業員のコメントに懸念すべき表現が含まれています。";
            }
        }
    }

    return "";
}

/**
 * 推奨アクションを生成
 */
export function generateSuggestions(
    pattern: string,
    theme: string,
    score: number,
    severity: string,
): string[] {
    const suggestions: string[] = [];

    // 深刻度別の基本アクション
    if (severity === "critical") {
        suggestions.push(
            "今週中に緊急1on1を設定し、現状を詳しくヒアリングしてください",
        );
        suggestions.push(
            "直近1-2週間で業務や環境に大きな変化がなかったか確認してください",
        );
    } else if (severity === "warning") {
        suggestions.push(
            "定期的な1on1を設定し、継続的にサポートする体制を作りましょう",
        );
        suggestions.push(
            "業務内容、役割、チーム環境など、複数の側面から課題を洗い出してください",
        );
    } else {
        suggestions.push(
            "定期的にコミュニケーションを取り、状況を注視してください",
        );
    }

    // パターン別のアクション
    if (pattern === "declining") {
        suggestions.push("急激な変化の原因を特定し、早急に対処してください");
    } else if (pattern === "stable_low") {
        suggestions.push("根本原因の特定と、中長期的な改善策が必要です");
        suggestions.push(
            "本人のキャリア希望や適性についても改めて確認しましょう",
        );
    } else if (pattern === "volatile") {
        suggestions.push("スコアの変動要因を分析し、安定化を図りましょう");
    }

    // テーマ別のアクション
    const themeLower = (theme || "").toLowerCase();
    if (themeLower.includes("離職")) {
        suggestions.push(
            "必要に応じて業務負荷の調整や配置転換を検討してください",
        );
    } else if (themeLower.includes("心理的安全性")) {
        suggestions.push("チーム内のコミュニケーション環境を見直してください");
    } else if (themeLower.includes("ワークライフ")) {
        suggestions.push(
            "労働時間や休暇取得状況を確認し、必要に応じて調整してください",
        );
    }

    return suggestions.slice(0, 5); // 最大5項目
}

/**
 * 対話のヒントを生成
 */
export function generateConversationHints(
    severity: string,
    theme: string,
    score: number,
): string[] {
    const hints: string[] = [];

    // 基本的な対話の心構え
    hints.push("責めるトーンではなく、サポートする姿勢で臨んでください");
    hints.push("心理的安全性を確保し、率直な対話を心がけてください");

    // 深刻度別のヒント
    if (severity === "critical") {
        hints.push(
            "「最近、何か困っていることや気になることはありますか？」と率直に聞いてみましょう",
        );
        hints.push("具体的な改善策を一緒に考える姿勢を示すことが重要です");
    } else if (severity === "warning") {
        hints.push(
            "「業務で負担に感じていることはありますか？」など具体的な質問から始めましょう",
        );
        hints.push(
            "小さな変化や改善でも、すぐに実行に移すことで信頼関係が築けます",
        );
    } else {
        hints.push(
            "日々の業務での小さな成功や成長を認め、ポジティブなフィードバックを心がけましょう",
        );
    }

    // テーマ別のヒント
    const themeLower = (theme || "").toLowerCase();
    if (themeLower.includes("離職")) {
        hints.push(
            "「この会社で実現したいキャリアはありますか？」とキャリアビジョンを確認しましょう",
        );
    } else if (themeLower.includes("心理的安全性")) {
        hints.push(
            "「チーム内で意見を言いやすい環境だと感じますか？」と環境面を確認しましょう",
        );
    } else if (themeLower.includes("ワークライフ")) {
        hints.push(
            "「休日はしっかり休めていますか？」とプライベートの時間についても気にかけましょう",
        );
    }

    return hints.slice(0, 5); // 最大5項目
}

/**
 * 従業員のコンディションを総合的に分析
 */
export function analyzeEmployeeCondition(
    sessions: PulseSession[],
    employee: Employee,
): AIAnalysis {
    if (sessions.length === 0) {
        return {
            severity: "attention",
            statusMessage: "データ不足",
            detailedAnalysis: "パルス回答のデータがまだ十分にありません。",
            suggestions: ["従業員にパルス回答を促してください"],
            conversationHints: ["定期的なコミュニケーションを心がけましょう"],
            trendAnalysis: {
                pattern: "stable_low",
                description: "データが不足しています",
            },
        };
    }

    const scores = sessions.map((s) => s.overall_score);
    const latestSession = sessions[0];
    const latestScore = latestSession.overall_score;
    const latestTheme = latestSession.pulse_intents?.label || "";

    // パターン検出
    const pattern = detectTrendPattern(scores);

    // 深刻度判定
    const severity = getSeverity(latestScore, pattern);

    // 状況メッセージ
    let statusMessage = "";
    if (severity === "critical") {
        statusMessage = pattern === "declining"
            ? "急激な状態悪化が見られます"
            : "深刻な状態が継続しています";
    } else if (severity === "warning") {
        statusMessage = "長期的な低スコアが継続しています";
    } else {
        statusMessage = "状況を注視する必要があります";
    }

    // 詳細分析の組み立て
    const analysisparts: string[] = [];
    analysisparts.push(getPatternDescription(pattern, scores));

    const themeAnalysis = getThemeSpecificAnalysis(latestTheme, latestScore);
    if (themeAnalysis) analysisparts.push(themeAnalysis);

    const commentAnalysis = analyzeComments(sessions);
    if (commentAnalysis) analysisparts.push(commentAnalysis);

    if (severity === "critical" || severity === "warning") {
        analysisparts.push("早急な介入と継続的なサポートが必要です。");
    }

    const detailedAnalysis = analysisparts.join(" ");

    // 推奨アクションとヒント生成
    const suggestions = generateSuggestions(
        pattern,
        latestTheme,
        latestScore,
        severity,
    );
    const conversationHints = generateConversationHints(
        severity,
        latestTheme,
        latestScore,
    );

    return {
        severity,
        statusMessage,
        detailedAnalysis,
        suggestions,
        conversationHints,
        trendAnalysis: {
            pattern,
            description: getPatternDescription(pattern, scores),
        },
    };
}
