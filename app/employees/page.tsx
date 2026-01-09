import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { AddEmployeeDialog } from "./add-employee-dialog";

export default async function EmployeesPage() {
    const supabase = await createClient();

    // 1. 認証チェック
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // 2. データ取得 (RLSを信頼するため tenant_id フィルタは不要)
    // divisions テーブルを left join して部署名を取得
    const { data: employees, error } = await supabase
        .from("employees")
        .select("*, divisions(name)");

    if (error) {
        console.error("Error fetching employees:", error);
        return <div>データの取得に失敗しました。</div>;
    }

    return (
        <div className="container mx-auto py-10 px-4 md:px-0">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold tracking-tight">社員名簿</h1>
                <AddEmployeeDialog />
            </div>

            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[200px]">名前</TableHead>
                            <TableHead>メールアドレス</TableHead>
                            <TableHead>役職 (Role)</TableHead>
                            <TableHead>部署</TableHead>
                            <TableHead className="text-right">登録日</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!employees || employees.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    社員データが見つかりません。
                                </TableCell>
                            </TableRow>
                        ) : (
                            employees.map((employee: any) => (
                                <TableRow key={employee.id}>
                                    <TableCell className="font-medium">{employee.full_name}</TableCell>
                                    <TableCell>{employee.email}</TableCell>
                                    <TableCell>
                                        {/* Roleの表示用ヘルパーがあれば使用推奨だが、今回は生データを表示 */}
                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                            {employee.role}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {/* 配列またはオブジェクトとして返る可能性があるため安全にアクセス */}
                                        {employee.divisions?.name || "-"}
                                    </TableCell>
                                    <TableCell className="text-right tabular-nums text-muted-foreground">
                                        {new Date(employee.created_at).toLocaleDateString("ja-JP")}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
