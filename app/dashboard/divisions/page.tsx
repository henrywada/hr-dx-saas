import { Suspense } from "react";
import { getDivisions } from "./actions";
import { DivisionManager } from "./_components/division-manager";
import { Division } from "./types";

export default async function DivisionPage() {
    const divisions = await getDivisions();

    // Build Tree Structure (Server Side)
    const buildTree = (divisions: Division[]) => {
        const map = new Map<string, Division & { children: Division[] }>();
        const roots: (Division & { children: Division[] })[] = [];

        // Deep copy and initialize children array
        divisions.forEach(d => {
            map.set(d.id, { ...d, children: [] });
        });

        // Connect children
        divisions.forEach(d => {
            const node = map.get(d.id)!;
            if (d.parent_id && map.has(d.parent_id)) {
                map.get(d.parent_id)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    };

    const treeData = buildTree(divisions);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">部署マスター管理</h1>
                <p className="text-muted-foreground">
                    組織の階層構造（部署・課・チーム）を管理します。
                </p>
            </div>

            <Suspense fallback={<div>Loading...</div>}>
                <DivisionManager flatDivisions={divisions} treeDivisions={treeData} />
            </Suspense>
        </div>
    );
}
