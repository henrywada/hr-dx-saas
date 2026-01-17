import { createAdminClient } from "@/utils/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Building2, ShieldAlert } from "lucide-react";

export default async function AllCompaniesPage() {
    // 1. 特権クライアント(adminSupabase)を作成
    const adminSupabase = createAdminClient();

    // 2. 全てのテナント（会社）を取得
    const { data: tenants, error } = await adminSupabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-md">
                エラーが発生しました: {error.message}
            </div>
        );
    }

    return (
        // レイアウト側で max-w-7xl や padding を設定済みなので、ここは space-y-8 だけでOKです
        <div className="space-y-8">

            {/* ヘッダーエリア */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">全契約企業一覧</h1>
                    <p className="text-muted-foreground mt-1">
                        システム上の全テナントデータを表示しています
                    </p>
                </div>
                <div className="flex items-center">
                    <span className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-sm font-bold border border-red-200">
                        <ShieldAlert className="h-4 w-4" />
                        特権モード
                    </span>
                </div>
            </div>

            {/* 統計カードエリア */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">登録企業数</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{tenants?.length || 0}社</div>
                    </CardContent>
                </Card>
            </div>

            {/* テーブルエリア */}
            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                {/* 横スクロール対応 */}
                <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead className="w-[300px]">会社ID (UUID)</TableHead>
                                <TableHead className="min-w-[200px]">会社名</TableHead>
                                <TableHead className="w-[150px]">登録日</TableHead>
                                <TableHead className="text-right w-[100px]">ステータス</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tenants?.map((tenant) => (
                                <TableRow key={tenant.id}>
                                    <TableCell className="font-mono text-xs text-gray-500">
                                        {tenant.id}
                                    </TableCell>
                                    <TableCell className="font-medium text-base">
                                        {tenant.name}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(tenant.created_at).toLocaleDateString("ja-JP")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!tenants || tenants.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        登録されている企業はありません
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}