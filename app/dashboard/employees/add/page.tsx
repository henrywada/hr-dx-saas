import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createEmployee } from "../actions";
import Link from "next/link";

export default async function AddEmployeePage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Get tenant_id to fetch divisions
    const { data: currentEmployee } = await supabase
        .from("employees")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

    if (!currentEmployee?.tenant_id) {
        return <div>Error: No tenant found.</div>;
    }

    // Fetch divisions for the specific tenant
    const { data: divisions } = await supabase
        .from("divisions")
        .select("id, name")
        .eq("tenant_id", currentEmployee.tenant_id);

    return (
        <div className="flex-1 p-8 pt-6">
            <div className="mx-auto max-w-2xl space-y-6 py-10">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">新規社員登録</h2>
                </div>

                <Card className="shadow-md rounded-lg">
                    <CardHeader>
                        <CardTitle>社員情報</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form action={createEmployee} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">氏名 <span className="text-red-500">*</span></Label>
                                <Input id="name" name="name" placeholder="John Doe" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">メールアドレス <span className="text-red-500">*</span></Label>
                                <Input id="email" name="email" type="email" placeholder="john@example.com" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="division">部署 <span className="text-red-500">*</span></Label>
                                    <Select name="division_id" required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="部署を選択してください" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {divisions?.map((div) => (
                                                <SelectItem key={div.id} value={div.id}>
                                                    {div.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="role">役職 <span className="text-red-500">*</span></Label>
                                    <Select name="role" required defaultValue="member">
                                        <SelectTrigger>
                                            <SelectValue placeholder="役職を選択してください" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="member">Member</SelectItem>
                                            <SelectItem value="boss">Boss</SelectItem>
                                            <SelectItem value="manager">Manager</SelectItem>
                                            <SelectItem value="hr">HR</SelectItem>
                                            <SelectItem value="hr_manager">HR Manager</SelectItem>
                                            <SelectItem value="developer">Developer</SelectItem>
                                            <SelectItem value="company_nurse">Company Nurse</SelectItem>
                                            <SelectItem value="doctor">Doctor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-4">
                                <Button variant="outline" asChild>
                                    <Link href="/dashboard/employees">キャンセル</Link>
                                </Button>
                                <Button type="submit">登録する</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
