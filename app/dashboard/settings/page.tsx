import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import PasswordUpdateForm from "@/components/auth/password-update-form";

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
                        <CardTitle>パスワード設定</CardTitle>
                    </div>
                    <CardDescription>
                        ログイン用のパスワードを設定・変更します。<br />
                        招待メールからログインした方は、こちらでパスワードを設定してください。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <PasswordUpdateForm />
                </CardContent>
            </Card>
        </div>
    );
}
