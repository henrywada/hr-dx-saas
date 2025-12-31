import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Bell,
    Home,
    Layout,
    LogOut,
    Plus,
    Settings,
    Users,
    Workflow,
    Search,
} from "lucide-react";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Fetch Employee and Tenant Data
    const { data: employee } = await supabase
        .from("employees")
        .select("*, tenants(*)")
        .eq("id", user.id)
        .single();

    const tenantName = employee?.tenants?.name || "Unknown Organization";
    const employeeName = employee?.name || user.email || "Guest";

    // Dummy Data for KPIs
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

    // Dummy Data for Recent Projects
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
        {
            name: "Monthly Report Generation",
            status: "Active",
            lastUpdated: "2024-03-20",
        },
        {
            name: "Lead Scoring Logic",
            status: "Draft",
            lastUpdated: "2024-03-15",
        },
    ];

    return (
        <div className="flex h-screen w-full bg-gray-50">
            {/* Sidebar */}
            <aside className="hidden w-64 flex-col border-r bg-white md:flex">
                <div className="flex h-16 items-center border-b px-6">
                    <span className="text-xl font-bold tracking-tight text-primary">
                        SaaS App
                    </span>
                </div>
                <nav className="flex-1 space-y-1 p-4">
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-primary"
                    >
                        <Home className="h-4 w-4" />
                        Home
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-muted-foreground hover:text-primary"
                    >
                        <Workflow className="h-4 w-4" />
                        Workflows
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-muted-foreground hover:text-primary"
                    >
                        <Settings className="h-4 w-4" />
                        Settings
                    </Button>
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <header className="flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
                    <div className="flex items-center gap-4 md:hidden">
                        {/* Mobile Menu Trigger could go here */}
                        <span className="font-bold text-primary">SaaS App</span>
                    </div>
                    <div className="flex flex-1 items-center justify-end gap-4">
                        <div className="mr-2 hidden flex-col items-end md:flex">
                            <span className="text-sm font-medium text-foreground">{employeeName}</span>
                            <span className="text-xs text-muted-foreground">{tenantName}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src="/placeholder-avatar.jpg" alt="@user" />
                                        <AvatarFallback className="bg-primary/10 text-primary">
                                            {employeeName.slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{employeeName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <form action={logout} className="w-full cursor-pointer">
                                        <button type="submit" className="flex w-full items-center">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Log out</span>
                                        </button>
                                    </form>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Dashboard Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    <div className="mx-auto max-w-6xl space-y-8">
                        {/* Welcome Section */}
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                    Hello, {employeeName}
                                </h1>
                                <p className="text-muted-foreground">
                                    Here's what's happening with your projects today at {tenantName}.
                                </p>
                            </div>
                            <Button size="lg" className="gap-2 shadow-md">
                                <Plus className="h-5 w-5" />
                                New Workflow
                            </Button>
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
                                    Recent Workflows
                                </h2>
                                <Button variant="outline" size="sm">
                                    View All
                                </Button>
                            </div>
                            <Card className="shadow-sm">
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
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
