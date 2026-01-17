import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, UserPlus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getRoleLabel } from "@/utils/roles";
import { DivisionSelector } from "./_components/division-selector"; // 追加

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // 1. 自分の情報を取得
    const { data: currentUserEmployee } = await supabase
        .from("employees")
        .select("tenant_id, role, name, tenants(name)")
        .eq("id", user.id)
        .single();

    if (!currentUserEmployee?.tenant_id) {
        return <div className="p-8">テナント情報が見つかりません。</div>;
    }

    // 2. 従業員一覧を取得 (division_id も含める)
    const { data: employees } = await supabase
        .from("employees")
        .select("*, divisions(id, name)") // divisionsを結合して現在の部署名も取得可能
        .eq("tenant_id", currentUserEmployee.tenant_id)
        .order("name", { ascending: true });

    // 3. ▼追加: 部署の選択肢一覧を取得 (階層順にソート)
    const { data: divisions } = await supabase
        .from("divisions")
        .select("id, name, layer")
        .eq("tenant_id", currentUserEmployee.tenant_id)
        .order("layer", { ascending: true })
        .order("name", { ascending: true });

    const employeeName = currentUserEmployee.name || user.email;
    const tenantData = currentUserEmployee.tenants;
    const tenantName = Array.isArray(tenantData) ? tenantData[0]?.name : (tenantData as any)?.name || "";
    const roleLabel = getRoleLabel(currentUserEmployee.role);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">従業員管理</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span className="font-medium text-foreground">{tenantName}</span>
                        {tenantName && <span>/</span>}
                        <span>{employeeName}</span>
                        <Badge variant="secondary" className="text-xs">
                            {roleLabel}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <Button asChild>
                        <Link href="/dashboard/settings/employees">
                            <UserPlus className="mr-2 h-4 w-4" /> 従業員を追加
                        </Link>
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[250px]">氏名</TableHead>
                                <TableHead>メールアドレス</TableHead>
                                <TableHead>所属 (Division)</TableHead>
                                <TableHead>役職</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees?.map((employee: any) => (
                                <TableRow key={employee.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src="/placeholder-avatar.jpg" alt={employee.name} />
                                                <AvatarFallback>{employee.name?.slice(0, 2).toUpperCase() || "EM"}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span>{employee.name || "Unknown"}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{employee.email}</TableCell>

                                    {/* ▼▼ 変更: 所属選択プルダウンを表示 ▼▼ */}
                                    <TableCell>
                                        <DivisionSelector
                                            employeeId={employee.id}
                                            currentDivisionId={employee.division_id}
                                            divisions={divisions || []}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <Badge variant="secondary" className="capitalize">
                                            {getRoleLabel(employee.role)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">
                                            詳細
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!employees || employees.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        従業員が登録されていません。
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}