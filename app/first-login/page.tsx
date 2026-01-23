'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { sendOtp, verifyAndRegister } from "./actions"; // 作成したアクションをインポート
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FirstLoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<'email' | 'details'>('email');
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // Step 1: メール送信処理
    const handleSendOtp = async (formData: FormData) => {
        setLoading(true);
        setError("");
        setMessage("");

        const res = await sendOtp(formData);

        setLoading(false);
        if (res.error) {
            setError(res.error);
        } else {
            // 成功したら次のステップへ
            setEmail(formData.get("email") as string);
            setStep('details');
            setMessage("認証コードを送信しました。メールを確認してください。");
        }
    };

    // Step 2: 登録・認証処理
    const handleRegister = async (formData: FormData) => {
        setLoading(true);
        setError("");

        // メールアドレスをFormDataに追加（表示はしていないが送信に必要）
        formData.append("email", email);

        const res = await verifyAndRegister(formData);

        if (res.error) {
            setLoading(false);
            setError(res.error);
        } else {
            // 成功したらポータルへ
            router.push("/portal");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">
                        {step === 'email' ? "従業員情報の登録" : "認証とパスワード設定"}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {step === 'email'
                            ? "人事部より登録されたメールアドレスを入力してください。"
                            : `メールアドレス: ${email}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>

                    {/* エラーメッセージ */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                            {error}
                        </div>
                    )}

                    {/* 成功メッセージ */}
                    {message && (
                        <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-md border border-green-200 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            {message}
                        </div>
                    )}

                    {step === 'email' ? (
                        /* Step 1 Form */
                        <form action={handleSendOtp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">メールアドレス</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="company@example.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                認証コードを受け取る <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </form>
                    ) : (
                        /* Step 2 Form */
                        <form action={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="otp">認証コード (6桁)</Label>
                                <Input
                                    id="otp"
                                    name="otp"
                                    type="text"
                                    placeholder="123456"
                                    required
                                    pattern="[0-9]{6}"
                                    className="text-center text-lg tracking-widest"
                                />
                                <p className="text-xs text-muted-foreground">メールに届いた6桁の数字を入力してください。</p>
                            </div>



                            <div className="space-y-2">
                                <Label htmlFor="password">新しいパスワード</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="8文字以上"
                                    required
                                    minLength={8}
                                />
                            </div>

                            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                登録してログイン
                            </Button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setStep('email')}
                                    className="text-sm text-gray-500 hover:underline"
                                >
                                    メールアドレス入力に戻る
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-6 text-center text-sm border-t pt-4">
                        <Link
                            href="/login"
                            className="text-blue-600 hover:underline"
                        >
                            ログイン画面に戻る
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}