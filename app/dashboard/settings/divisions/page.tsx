import { Suspense } from "react";
import { getDivisionsWithEmployees } from "./actions";
import { DivisionManager } from "./_components/division-manager";
import { Building2 } from "lucide-react";

export default async function DivisionPage() {
    const { divisions, employees } = await getDivisionsWithEmployees();

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Building2 className="h-8 w-8 text-orange-600" />
                    <h1 className="text-3xl font-bold tracking-tight">組織・従業員管理</h1>
                </div>
                <p className="text-muted-foreground">
                    組織の階層構造（部署・課・チーム）と所属従業員を管理します。<br />
                    各部署をクリックすると、所属する従業員の編集・削除ができます。
                </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6 min-h-[500px]">
                <Suspense fallback={<div>Loading...</div>}>
                    <DivisionManager
                        flatDivisions={divisions}
                        employees={employees}
                    />
                </Suspense>
            </div>
        </div>
    );
}
