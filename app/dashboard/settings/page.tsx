import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">基本設定</h3>
                <p className="text-sm text-muted-foreground">
                    アカウントとシステムの基本設定を管理します。
                </p>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>設定メニューを選択してください</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <CardDescription>
                        左側のメニューから設定項目を選択してください。<br />
                        現在は『部署・組織構成』が利用可能です。
                    </CardDescription>
                </CardContent>
            </Card>
        </div>
    );
}
