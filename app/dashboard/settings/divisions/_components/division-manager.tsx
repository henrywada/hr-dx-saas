"use client";

import { Division, Employee } from "../types";
import { deleteDivision } from "../actions";
import { DivisionDialog } from "./division-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Building2, ChevronRight, Edit, Trash2, Network, Users } from "lucide-react";
import { useState } from "react";

interface DivisionManagerProps {
    flatDivisions: Division[];
    employees: Employee[];
}

// レイヤーごとの色定義（最大10レイヤー）
const LAYER_COLORS: Record<number, string> = {
    1: "bg-orange-50 border-orange-200 text-orange-800",
    2: "bg-blue-50 border-blue-200 text-blue-800",
    3: "bg-green-50 border-green-200 text-green-800",
    4: "bg-purple-50 border-purple-200 text-purple-800",
    5: "bg-pink-50 border-pink-200 text-pink-800",
    6: "bg-yellow-50 border-yellow-200 text-yellow-800",
    7: "bg-indigo-50 border-indigo-200 text-indigo-800",
    8: "bg-teal-50 border-teal-200 text-teal-800",
    9: "bg-cyan-50 border-cyan-200 text-cyan-800",
    10: "bg-rose-50 border-rose-200 text-rose-800",
};

const LAYER_NAMES: Record<number, string> = {
    1: "レイヤー1",
    2: "レイヤー2",
    3: "レイヤー3",
    4: "レイヤー4",
    5: "レイヤー5",
    6: "レイヤー6",
    7: "レイヤー7",
    8: "レイヤー8",
    9: "レイヤー9",
    10: "レイヤー10",
};

// ツリー構造を構築する関数
function buildTree(divisions: Division[]): Division[] {
    const divisionMap = new Map<string, Division & { children: Division[] }>();
    const roots: (Division & { children: Division[] })[] = [];

    // 全てのノードをマップに登録
    divisions.forEach(div => {
        divisionMap.set(div.id, { ...div, children: [] });
    });

    // 親子関係を構築
    divisions.forEach(div => {
        const node = divisionMap.get(div.id);
        if (!node) return;

        if (div.parent_id) {
            const parent = divisionMap.get(div.parent_id);
            if (parent) {
                parent.children.push(node);
            } else {
                roots.push(node); // 親が見つからない場合はルートに
            }
        } else {
            roots.push(node);
        }
    });

    // ソート関数（code優先、codeがない場合はname）
    const sortChildren = (children: Division[]) => {
        return children.sort((a, b) => {
            // codeが両方ある場合
            if (a.code && b.code) return a.code.localeCompare(b.code);
            // codeがない方を後ろに
            if (!a.code && b.code) return 1;
            if (a.code && !b.code) return -1;
            // 両方codeがない場合はnameで比較
            return a.name.localeCompare(b.name);
        });
    };

    // 各ノードの子要素を再帰的にソート
    const sortRecursive = (nodes: Division[]) => {
        nodes.forEach(node => {
            if (node.children && node.children.length > 0) {
                node.children = sortChildren(node.children);
                sortRecursive(node.children);
            }
        });
    };

    // ルートをソート
    const sortedRoots = sortChildren(roots);
    // 再帰的にソート
    sortRecursive(sortedRoots);

    return sortedRoots;
}

function TreeNode({ 
    division, 
    level = 0,
    onEdit,
    onDelete,
    parentCandidates,
    employees
}: { 
    division: Division & { children?: Division[] }, 
    level?: number,
    onEdit: (div: Division) => void,
    onDelete: (id: string) => void,
    parentCandidates: Division[],
    employees: Employee[]
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showEmployees, setShowEmployees] = useState(false);
    
    const hasChildren = division.children && division.children.length > 0;
    const divisionEmployees = employees.filter(emp => emp.division_id === division.id);
    const layerColor = LAYER_COLORS[division.layer as number] || "bg-gray-50 border-gray-200 text-gray-800";

    return (
        <div className="space-y-2">
            <div 
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all hover:shadow-md ${layerColor}`}
                style={{ marginLeft: `${level * 2}rem` }}
            >
                {hasChildren && (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-white/50 rounded"
                    >
                        <ChevronRight 
                            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                        />
                    </button>
                )}
                {!hasChildren && <div className="w-6" />}
                
                <Building2 className="h-4 w-4" />
                
                <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                        {division.code && (
                            <span className="text-xs text-gray-500 lowercase">{division.code}</span>
                        )}
                        <span className="font-bold text-sm">{division.name}</span>
                        <span className="text-xs opacity-60">
                            {LAYER_NAMES[division.layer || 0] || `レイヤー${division.layer}`}
                        </span>
                    </div>
                </div>

                {divisionEmployees.length > 0 && (
                    <button
                        onClick={() => setShowEmployees(!showEmployees)}
                        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/50 text-xs"
                    >
                        <Users className="h-3 w-3" />
                        <span>{divisionEmployees.length}人</span>
                    </button>
                )}

                <div className="flex gap-1">
                    <DivisionDialog
                        editDivision={division}
                        parentCandidates={parentCandidates}
                        trigger={
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Edit className="h-3 w-3" />
                            </Button>
                        }
                    />
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                        onClick={async () => {
                            if (confirm(`「${division.name}」を削除してもよろしいですか？`)) {
                                await deleteDivision(division.id);
                            }
                        }}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* 従業員リスト */}
            {showEmployees && divisionEmployees.length > 0 && (
                <div 
                    className="ml-8 space-y-1 p-2 bg-gray-50/50 rounded border border-gray-200"
                    style={{ marginLeft: `${(level * 2) + 3}rem` }}
                >
                    {divisionEmployees.map(emp => (
                        <div 
                            key={emp.id}
                            className="flex items-center gap-2 p-2 bg-white rounded text-xs hover:shadow-sm"
                        >
                            <div className="flex-1">
                                <div className="font-medium">{emp.name}</div>
                                <div className="text-gray-500">{emp.email}</div>
                            </div>
                            <div className="text-gray-600 text-xs">
                                {emp.app_role === 'hr_manager' && '人事マネージャー'}
                                {emp.app_role === 'hr' && '人事'}
                                {emp.app_role === 'manager' && 'マネージャー'}
                                {emp.app_role === 'employee' && '一般'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 子部署 */}
            {hasChildren && isExpanded && (
                <div className="space-y-2">
                    {division.children!.map(child => (
                        <TreeNode 
                            key={child.id} 
                            division={child} 
                            level={level + 1}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            parentCandidates={parentCandidates}
                            employees={employees}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function DivisionManager({ flatDivisions, employees }: DivisionManagerProps) {
    const tree = buildTree(flatDivisions);
    
    const layerStats = flatDivisions.reduce((acc, div) => {
        const layer = div.layer || 0;
        acc[layer] = (acc[layer] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);

    const handleEdit = (division: Division) => {
        // 編集はダイアログで処理
    };

    const handleDelete = async (id: string) => {
        await deleteDivision(id);
    };

    return (
        <div className="space-y-6">
            {/* 統計カード */}
            <div className="grid gap-3 md:grid-cols-4">
                <Card>
                    <CardContent className="flex items-center justify-between py-3 px-4">
                        <span className="text-sm font-medium text-muted-foreground">総組織数：</span>
                        <span className="text-lg font-bold">{flatDivisions.length}</span>
                    </CardContent>
                </Card>

                {Object.keys(layerStats)
                    .map(Number)
                    .sort((a, b) => a - b)
                    .map(layer => (
                        <Card key={layer}>
                            <CardContent className="flex items-center justify-between py-3 px-4">
                                <span className="text-sm font-medium text-muted-foreground">
                                    {LAYER_NAMES[layer] || `レイヤー${layer}`}：
                                </span>
                                <span className="text-lg font-bold">{layerStats[layer]}</span>
                            </CardContent>
                        </Card>
                    )
                )}
            </div>

            {/* ツリービュー */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Network className="h-5 w-5 text-orange-600" />
                                組織階層図
                            </CardTitle>
                            <CardDescription className="mt-2">
                                クリックして展開・折りたたみできます。各ノードの編集・削除も可能です。
                            </CardDescription>
                        </div>
                        <DivisionDialog
                            parentCandidates={flatDivisions}
                            trigger={
                                <Button className="bg-orange-600 hover:bg-orange-700">
                                    <Plus className="mr-2 h-4 w-4" />
                                    新規追加
                                </Button>
                            }
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {tree.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Building2 className="h-12 w-12 mb-4 opacity-20" />
                            <p className="text-sm">組織がまだ登録されていません</p>
                            <p className="text-xs mt-2">「新規追加」ボタンから最初の組織を作成してください</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {tree.map(node => (
                                <TreeNode 
                                    key={node.id} 
                                    division={node}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    parentCandidates={flatDivisions}
                                    employees={employees}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* レイヤー説明 */}
            <Card className="border-dashed bg-gray-50/50">
                <CardHeader>
                    <CardTitle className="text-sm">階層設計のガイドライン</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>• 組織は<strong>最大10階層</strong>まで設定可能です</p>
                    <p>• 各レイヤーは親レイヤーより1つ大きい数値を設定してください</p>
                    <p>• 推奨構成例：</p>
                    <p className="pl-4">- レイヤー1: 全社・本部</p>
                    <p className="pl-4">- レイヤー2: 事業所・工場・支社</p>
                    <p className="pl-4">- レイヤー3〜: 部門・課・チーム等</p>
                    <p className="pt-2 text-xs">
                        ※ この階層設定は、ストレスチェックや組織サーベイの「部署別集計」に使用されます。
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
