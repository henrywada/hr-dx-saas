import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Activity,
    FileText,
    MoreHorizontal,
    Play,
    Zap,
} from "lucide-react";
import { getWorkflows } from "./actions";
import { CreateWorkflowDialog } from "./_components/create-workflow-dialog";


export default async function WorkflowsPage() {
    const workflows = await getWorkflows();

    // 統計データ (リアルデータから計算、またはこれらはまだモックで良いか確認。
    // 指示では「一覧表示のリアル化」がメイン。統計は触れられていないが、
    // Workflowsの数はリアルにできる。)
    // I will simplisticly update "Total Workflows" and keep others as mock or remove if potentially confusing.
    // I'll keep them as mock but update Total Workflows count.

    const activeCount = workflows.filter(w => w.status === 'active').length;

    const stats = [
        {
            title: "Total Workflows",
            value: workflows.length.toString(),
            icon: FileText,
            color: "text-blue-500",
        },
        {
            title: "Active Workflows", // Changed "Active Agents" to Workflows to be accurate
            value: activeCount.toString(),
            icon: Zap,
            color: "text-green-500",
        },
        {
            title: "Total Executions",
            value: "1,234", // Mock
            icon: Activity,
            color: "text-orange-500",
        },
    ];

    return (
        <div className="container mx-auto space-y-8">
            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Workflows</h2>
                    <p className="text-muted-foreground">
                        AIエージェントと自動化プロセスの管理
                    </p>
                </div>
                <CreateWorkflowDialog />
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {stats.map((stat) => (
                    <Card key={stat.title}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Workflow List Table */}
            <Card>
                {workflows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold">ワークフローがまだありません</h3>
                        <p className="text-muted-foreground mb-4">
                            新しいワークフローを作成して、業務を自動化しましょう。
                        </p>
                        <CreateWorkflowDialog />
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Workflow Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {workflows.map((workflow) => (
                                <TableRow key={workflow.id} className="hover:bg-muted/50">
                                    <TableCell>
                                        <div className="font-medium">{workflow.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {workflow.description}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={workflow.status === "active" ? "default" : "secondary"}
                                            className={
                                                workflow.status === "active"
                                                    ? "bg-green-500 hover:bg-green-600"
                                                    : workflow.status === "draft"
                                                        ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                                                        : "bg-gray-500 text-white"
                                            }
                                        >
                                            {workflow.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {/* Using a simple date format or date-fns if installed. 
                                            I'll use basic JS date for safety if date-fns isn't around, 
                                            but commonly it is in these stacks. 
                                            Actually I saw date-fns in my imports above, wait I added it.
                                            I should check package.json or just use standard Intl.
                                            Safest is standard Intl.DateTimeFormat.
                                        */}
                                        {new Date(workflow.created_at).toLocaleDateString("ja-JP")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon">
                                                <Play className="h-4 w-4 text-green-600" />
                                            </Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>
        </div>
    );
}
