'use client';

import { useState } from "react";
import { Division } from "../types";
import { deleteDivision } from "../actions";
import { DivisionDialog } from "./division-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ChevronRight,
    ChevronDown,
    Building2,
    Trash2,
    MoreHorizontal,
    FolderOpen,
} from "lucide-react";

interface OrgTreeProps {
    divisions: Division[];
}

// 再帰的に描画する単一ノードコンポーネント
function TreeNode({ node, allDivisions, level }: { node: Division, allDivisions: Division[], level: number }) {
    const [isOpen, setIsOpen] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm(`「${node.name}」を削除しますか？\n※下位部署がある場合は削除できません。`)) return;
        try {
            setIsDeleting(true);
            await deleteDivision(node.id);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsDeleting(false);
        }
    };

    const hasChildren = node.children && node.children.length > 0;

    return (
        <div className="w-full">
            <div
                className={`
                    flex items-center justify-between p-2 rounded-lg border mb-2 bg-white transition-all hover:shadow-sm
                    ${level === 0 ? 'border-l-4 border-l-primary' : 'border-l-4 border-l-transparent ml-6'}
                `}
            >
                <div className="flex items-center gap-2">
                    {/* 開閉トグルボタン */}
                    {hasChildren ? (
                        <button onClick={() => setIsOpen(!isOpen)} className="p-1 hover:bg-gray-100 rounded">
                            {isOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                        </button>
                    ) : (
                        <div className="w-6" /> // スペーサー
                    )}

                    <div className={`p-2 rounded-md ${level === 0 ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-600'}`}>
                        {level === 0 ? <Building2 className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                    </div>

                    <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                            {node.name}
                            {node.code && <Badge variant="outline" className="text-[10px] h-5">{node.code}</Badge>}
                        </div>
                        {level === 0 && <div className="text-xs text-muted-foreground">Root Division</div>}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* 編集ボタン (DivisionDialogがトリガーボタンを描画) */}
                    <DivisionDialog
                        division={node}
                        parentCandidates={allDivisions}
                    />

                    {/* その他アクションメニュー */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isDeleting}>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600 cursor-pointer">
                                <Trash2 className="mr-2 h-4 w-4" /> 削除
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* 子要素の再帰描画 */}
            {isOpen && hasChildren && (
                <div className="border-l-2 border-dashed border-gray-200 ml-5 pl-2">
                    {node.children!.map(child => (
                        <TreeNode key={child.id} node={child} allDivisions={allDivisions} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function OrgTree({ divisions }: OrgTreeProps) {
    // フラットな配列をツリー構造に変換するヘルパー関数
    const buildTree = (items: Division[]) => {
        const itemMap = new Map<string, Division>();
        const roots: Division[] = [];

        // 参照を切るためにオブジェクトをコピーし、childrenを初期化
        const nodes = items.map(item => ({ ...item, children: [] as Division[] }));

        nodes.forEach(node => itemMap.set(node.id, node));
        nodes.forEach(node => {
            if (node.parent_id && itemMap.has(node.parent_id)) {
                itemMap.get(node.parent_id)!.children!.push(node);
            } else {
                roots.push(node);
            }
        });
        return roots;
    };

    const treeData = buildTree(divisions);

    if (treeData.length === 0 && divisions.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                <Building2 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>部署が登録されていません。</p>
                <p className="text-sm">右上のボタンから最初の部署を追加してください。</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {treeData.map(node => (
                <TreeNode key={node.id} node={node} allDivisions={divisions} level={0} />
            ))}
        </div>
    );
}