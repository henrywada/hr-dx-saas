import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Layout,
    Users,
    Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    const { data: employee } = await supabase
        .from("employees")
        .select("*, tenants(*)")
        .eq("id", user.id)
        .single();

    const tenantName = employee?.tenants?.name || "Unknown Organization";

    // KPIデータのダミー
    const kpiData = [
        {
            title: "Created Workflows",
            value: "12",
            icon: Layout,
            color: "text-blue-600",
        },
        {
            title: "Monthly Executions",
            value: "145",
            icon: Workflow,
            color: "text-green-600",
        },
        {
            title: "Team Members",
            value: "3",
            icon: Users,
            color: "text-purple-600",
        },
    ];

    // 最近のプロジェクトデータのダミー
    const recentWorkflows = [
        {
            name: "Onboarding Automation",
            status: "Active",
            lastUpdated: "2024-04-01",
        },
        {
            name: "Email Campaign Sequence",
            status: "Draft",
            lastUpdated: "2024-03-28",
        },
        {
            name: "Data Sync: CRM to sheet",
            status: "Active",
            lastUpdated: "2024-03-25",
        },
    ];

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            {/* Header Section */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Settings
                    </h1>
                    <p className="text-muted-foreground">
                        {tenantName} の各種マスター設定と保守を行います。
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {kpiData.map((kpi, index) => (
                    <Card key={index} className="shadow-sm transition-shadow hover:shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {kpi.title}
                            </CardTitle>
                            <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">
                                {kpi.value}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Workflows */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                        Recent Logs
                    </h2>
                    <Button variant="outline" size="sm">
                        View All
                    </Button>
                </div>
                <Card className="shadow-sm">
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Project Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentWorkflows.map((workflow, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium text-foreground">
                                            {workflow.name}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${workflow.status === "Active"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-gray-100 text-gray-800"
                                                    }`}
                                            >
                                                {workflow.status}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {workflow.lastUpdated}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">
                                                ...
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
