"use server";

import { createAdminClient, createClient } from "@/utils/supabase/server";
import { ImportEmployeeRow, ImportResult } from "@/types/employee-import";
import Papa from "papaparse";

const DATA_ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || "dev-secret-key";

/**
 * CSVデータを受け取り、従業員を一括インポートする
 */
export async function importEmployeesAction(
    formData: FormData,
): Promise<ImportResult> {
    const result: ImportResult = {
        success: false,
        total: 0,
        successCount: 0,
        failureCount: 0,
        errors: [],
    };

    try {
        // 1. 権限チェック & テナントID取得
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            throw new Error("認証されていません");
        }

        // 自分の従業員情報を取得して権限とテナントを確認
        const { data: currentEmployee, error: empError } = await supabase
            .from("employees")
            .select("tenant_id, app_role")
            .eq("id", user.id)
            .single();

        if (empError || !currentEmployee) {
            throw new Error("従業員情報の取得に失敗しました");
        }

        if (
            !["hr_manager", "saas_adm"].includes(currentEmployee.app_role || "")
        ) {
            throw new Error(
                "権限がありません（HR Manager または SaaS Admin である必要があります）",
            );
        }

        const tenantId = currentEmployee.tenant_id;

        // 2. CSVパース
        const file = formData.get("file") as File;
        if (!file) {
            throw new Error("ファイルがアップロードされていません");
        }

        const text = await file.text();
        const parseResult = Papa.parse<ImportEmployeeRow>(text, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) =>
                header.trim().toLowerCase().replace(/[\s"']/g, "_"),
            // Header normalization: "部署コード" -> "division_code" map is needed?
            // For simplicity, we assume the CSV headers match the interface keys OR we map them manually.
            // Let's assume the user uses the template which has keys: name, email, division_code, role
        });

        if (parseResult.errors.length > 0) {
            throw new Error(
                "CSVの解析に失敗しました: " + parseResult.errors[0].message,
            );
        }

        const rows = parseResult.data;
        result.total = rows.length;

        // 3. 準備: 部署コード一覧の取得 (Cache for performance)
        const { data: divisions } = await supabase
            .from("divisions")
            .select("id, code")
            .eq("tenant_id", tenantId);

        const divisionMap = new Map<string, string>();
        divisions?.forEach((d) => {
            if (d.code) divisionMap.set(d.code, d.id);
        });

        const adminClient = await createAdminClient();

        // 4. ループ処理
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowNum = i + 2; // Header is line 1

            // 簡易バリデーション
            if (!row.email || !row.name || !row.role) {
                result.failureCount++;
                result.errors.push({
                    row: rowNum,
                    email: row.email || "unknown",
                    reason: "必須項目が不足しています (name, email, role)",
                });
                continue;
            }

            // 役職バリデーション
            const validRoles = [
                "employee",
                "hr_manager",
                "hr",
                "boss",
                "company_doctor",
                "company_nurse",
                "hsc",
                "developer",
                "test",
            ];
            if (!validRoles.includes(row.role)) {
                result.failureCount++;
                result.errors.push({
                    row: rowNum,
                    email: row.email,
                    reason: `無効な役職です: ${row.role}`,
                });
                continue;
            }

            // 部署コード解決
            let divisionId: string | null = null;
            if (row.division_code) {
                divisionId = divisionMap.get(row.division_code) || null;
                if (!divisionId) {
                    result.failureCount++;
                    result.errors.push({
                        row: rowNum,
                        email: row.email,
                        reason:
                            `部署コードが見つかりません: ${row.division_code}`,
                    });
                    continue;
                }
            }

            try {
                // A. Authユーザー作成 (Admin)
                // inviteUserByEmail sends an invite email.
                const { data: authData, error: authError } = await adminClient
                    .auth.admin.inviteUserByEmail(row.email, {
                        data: {
                            // Metadata if needed
                        },
                    });

                if (authError) {
                    // 重複エラー等の場合
                    if (
                        authError.message.includes(
                            "already has been registered",
                        ) || authError.status === 422
                    ) {
                        result.failureCount++;
                        result.errors.push({
                            row: rowNum,
                            email: row.email,
                            reason: "既に登録されているユーザーです (Skip)",
                        });
                        continue;
                    }
                    throw authError;
                }

                const newUserId = authData.user.id;

                // B. DB登録 (RPC using Encrypted Insert)
                const { error: dbError } = await supabase.rpc(
                    "import_employee_encrypted",
                    {
                        p_id: newUserId,
                        p_tenant_id: tenantId,
                        p_division_id: divisionId,
                        p_name: row.name,
                        p_app_role: row.role,
                        p_encryption_key: DATA_ENCRYPTION_KEY,
                    },
                );

                if (dbError) {
                    // DB登録失敗時はAuthユーザーを消すべきだが、Inviteの場合は難しい。
                    // 今回はPartial Successとしてエラー計上のみ。
                    console.error("DB Insert Error", dbError);
                    result.failureCount++;
                    result.errors.push({
                        row: rowNum,
                        email: row.email,
                        reason: "DB登録に失敗しました: " + dbError.message,
                    });
                    // rollback auth? await adminClient.auth.admin.deleteUser(newUserId);
                    continue;
                }

                result.successCount++;
            } catch (e: any) {
                result.failureCount++;
                result.errors.push({
                    row: rowNum,
                    email: row.email,
                    reason: e.message,
                });
            }
        }

        result.success = true;
        return result;
    } catch (error: any) {
        console.error("Import Error:", error);
        return {
            success: false,
            total: 0,
            successCount: 0,
            failureCount: 0,
            errors: [{
                row: 0,
                email: "",
                reason: "全体エラー: " + error.message,
            }],
        };
    }
}
