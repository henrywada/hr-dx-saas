import { Suspense } from "react";
import { getDivisions } from "./actions";
import { DivisionManager } from "./_components/division-manager";
import { Building2 } from "lucide-react";

export default async function DivisionPage() {
    // サーバーサイドでデータを取得
    const divisions = await getDivisions();

    // OrgTreeコンポーネント内でツリー構築を行うため、
    // ここでは単純にフラットなリストを渡します。

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Building2 className="h-8 w-8 text-orange-600" />
                    <h1 className="text-3xl font-bold tracking-tight">組織・部署管理</h1>
                </div>
                <p className="text-muted-foreground">
                    組織の階層構造（部署・課・チーム）を管理します。<br />
                    ここでの設定は、ストレスチェックやサーベイの「部署別分析」の基礎データとなります。
                </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6 min-h-[500px]">
                <Suspense fallback={<div>Loading...</div>}>
                    {/* flatDivisions: ダイアログの「親部署選択」プルダウン用
                        treeDivisions: ツリー表示用（OrgTree内で変換ロジックを持つため、リストをそのまま渡す）
                    */}
                    <DivisionManager
                        flatDivisions={divisions}
                        treeDivisions={divisions} // OrgTreeのI/Fに合わせてリストを渡す
                    />
                </Suspense>
            </div>
        </div>
    );
}