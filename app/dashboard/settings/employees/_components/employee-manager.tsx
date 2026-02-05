"use client";
import { deleteEmployee } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Edit, Trash2, Building2, Mail, Plus, ChevronDown, ChevronRight, UserCheck, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { EmployeeImportDialog } from "./import-dialog";
import { EmployeeDialog } from "./employee-dialog";


type Division = {
    id: string;
    name: string;
    code: string | null;
    layer: number;
    parent_id: string | null;
};

type Employee = {
    id: string;
    name: string;
    email: string;
    app_role: string;
    division_id: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    is_manager: boolean;
    group_name: string | null;
};

interface EmployeeManagerProps {
    employees: Employee[];
    divisions: Division[];
}

const ROLE_LABELS: Record<string, string> = {
    employee: "従業員",
    hr_manager: "人事マネージャー",
    hr: "人事",
    boss: "上司",
    company_doctor: "産業医",
    company_nurse: "保健師",
    hsc: "安全衛生委員",
};

// レイヤーごとの色設定（divisions画面と同じ）
const LAYER_COLORS: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    2: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    3: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    4: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    5: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
    6: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
    7: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    8: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    9: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
    10: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
};

const DEFAULT_COLOR = { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" };

export function EmployeeManager({ employees, divisions }: EmployeeManagerProps) {
    const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());

    // ツリー構造を構築
    const buildTree = (divs: Division[]) => {
        const map = new Map<string, Division & { children: (Division & { children: any[] })[] }>();
        const roots: (Division & { children: any[] })[] = [];

        divs.forEach(d => map.set(d.id, { ...d, children: [] }));
        divs.forEach(d => {
            const node = map.get(d.id)!;
            if (d.parent_id && map.has(d.parent_id)) {
                map.get(d.parent_id)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        // 子要素をcodeでソート
        const sortChildren = (nodes: any[]) => {
            nodes.sort((a, b) => {
                const codeA = a.code || '';
                const codeB = b.code || '';
                return codeA.localeCompare(codeB);
            });
            nodes.forEach(node => {
                if (node.children.length > 0) {
                    sortChildren(node.children);
                }
            });
        };

        sortChildren(roots);
        return roots;
    };

    const tree = buildTree(divisions);

    // 部署でグループ化
    const grouped = employees.reduce((acc, emp) => {
        const key = emp.division_id || "unassigned";
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(emp);
        return acc;
    }, {} as Record<string, Employee[]>);

    const handleEdit = (employee: Employee) => {
        setEditEmployee(employee);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
    if (confirm(`${name}を削除してもよろしいですか？`)) {
        try {
            await deleteEmployee(id);
        } catch (error: any) {
            alert(`削除に失敗しました: ${error.message}`);
        }
    }
};

    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setEditEmployee(null);
    };

    const toggleDivision = (divisionId: string) => {
        const newExpanded = new Set(expandedDivisions);
        if (newExpanded.has(divisionId)) {
            newExpanded.delete(divisionId);
        } else {
            newExpanded.add(divisionId);
        }
        setExpandedDivisions(newExpanded);
    };

    // ツリーノードを再帰的にレンダリング
    const renderTreeNode = (node: Division & { children: any[] }, depth: number = 0) => {
        const divisionEmployees = grouped[node.id] || [];
        const isExpanded = expandedDivisions.has(node.id);
        const layerColors = LAYER_COLORS[node.layer] || DEFAULT_COLOR;
        const hasChildren = node.children.length > 0;
        const hasEmployees = divisionEmployees.length > 0;

        return (
            <div key={node.id} className="space-y-1" style={{ marginLeft: `${depth * 24}px` }}>
                {/* 部署ヘッダー */}
                <div 
                    className={`flex items-center justify-between gap-2 p-3 rounded-lg border cursor-pointer ${layerColors.bg} ${layerColors.border}`}
                    onClick={() => toggleDivision(node.id)}
                >
                    <div className="flex items-center gap-2">
                        {(hasChildren || hasEmployees) ? (
                            isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-gray-500" />
                            )
                        ) : (
                            <div className="w-4" />
                        )}
                        <Building2 className={`h-4 w-4 ${layerColors.text}`} />
                        {node.code && (
                            <span className="text-xs text-gray-500 lowercase">{node.code}</span>
                        )}
                        <span className={`font-semibold text-sm ${layerColors.text}`}>
                            {node.name}
                        </span>
                        <span className="text-xs text-gray-500">
                            レイヤー{node.layer}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-600">
                            従業員 {divisionEmployees.length}人
                        </span>
                    </div>
                </div>

                {/* 展開時の従業員リスト */}
                {isExpanded && hasEmployees && (
                    <div className="ml-6 space-y-1">
                        {divisionEmployees.map(emp => (
                            <div
                                key={emp.id}
                                className="flex items-center justify-between gap-4 p-2 hover:bg-gray-50 rounded transition-all"
                            >
                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {emp.last_sign_in_at ? (
                                            <div title={`最終アクセス: ${new Date(emp.last_sign_in_at).toLocaleDateString()}`}>
                                                <UserCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                            </div>
                                        ) : (
                                            <div title="未アクセス">
                                                <Users className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                            </div>
                                        )}
                                        <div className="text-sm truncate">
                                            {emp.name}
                                            {emp.email && (
                                                <span className="ml-2 text-xs text-gray-500">
                                                    ({emp.email})
                                                </span>
                                            )}
                                            {emp.group_name && (
                                                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-medium border border-purple-200">
                                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    </svg>
                                                    {emp.group_name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="w-32 text-xs text-gray-600 text-right flex items-center justify-end gap-1">
                                        {emp.is_manager && (
                                            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-600" title="マネージャー">
                                                <BadgeCheck className="h-3.5 w-3.5" />
                                            </div>
                                        )}
                                        {ROLE_LABELS[emp.app_role] || emp.app_role}
                                    </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEdit(emp);
                                        }}
                                    >
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(emp.id, emp.name);
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 子部署を再帰的にレンダリング */}
                {isExpanded && hasChildren && (
                    <div className="space-y-1">
                        {node.children.map(child => renderTreeNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const unaccessedCount = employees.filter(e => !e.last_sign_in_at).length;

    return (
        <div className="space-y-6">
            {/* ヘッダー */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-orange-600" />
                                従業員管理
                            </CardTitle>
                            <CardDescription>
                                {employees.length}名の従業員が登録されています
                                {unaccessedCount > 0 && (
                                    <span className="ml-2 text-gray-500">
                                        （うち未アクセス：<span className="text-red-500 font-medium">{unaccessedCount}名</span>）
                                    </span>
                                )}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <EmployeeImportDialog />
                            <EmployeeDialog
                                divisions={divisions}
                                editEmployee={editEmployee}
                                isOpen={isDialogOpen}
                                onClose={handleDialogClose}
                                trigger={
                                    <Button className="bg-orange-600 hover:bg-orange-700">
                                        <Plus className="h-4 w-4 mr-2" />
                                        新規登録
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* 従業員リスト */}
            <Card>
                <CardContent className="pt-6">
                    {employees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-sm">従業員がまだ登録されていません</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* 未割り当て */}
                            {grouped["unassigned"] && grouped["unassigned"].length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 border-b pb-2">
                                        <Users className="h-4 w-4" />
                                        <span>未割り当て</span>
                                        <span className="text-gray-400">({grouped["unassigned"].length}人)</span>
                                    </div>
                                    <div className="ml-6 space-y-1">
                                        {grouped["unassigned"].map(emp => (
                                            <div
                                                key={emp.id}
                                                className="flex items-center justify-between gap-4 p-2 hover:bg-gray-50 rounded transition-all"
                                            >
                                                <div className="flex items-center gap-6 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        {emp.last_sign_in_at ? (
                                                            <div title={`最終アクセス: ${new Date(emp.last_sign_in_at).toLocaleDateString()}`}>
                                                                <UserCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                                            </div>
                                                        ) : (
                                                            <div title="未アクセス">
                                                                <Users className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                                            </div>
                                                        )}
                                                        <div className="text-sm truncate">
                                                            {emp.name}
                                                            {emp.email && (
                                                                <span className="ml-2 text-xs text-gray-500">
                                                                    ({emp.email})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="w-32 text-xs text-gray-600 text-right flex items-center justify-end gap-1">
                                                        {emp.is_manager && (
                                                            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-100 text-blue-600" title="マネージャー">
                                                                <BadgeCheck className="h-3.5 w-3.5" />
                                                            </div>
                                                        )}
                                                        {ROLE_LABELS[emp.app_role] || emp.app_role}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 flex-shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0"
                                                        onClick={() => handleEdit(emp)}
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 hover:bg-red-100 hover:text-red-600"
                                                        onClick={() => handleDelete(emp.id, emp.name)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ツリー表示 */}
                            <div className="space-y-2">
                                {tree.map(node => renderTreeNode(node, 0))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
