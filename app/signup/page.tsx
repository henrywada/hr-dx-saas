'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { sendOtp, verifyAndRegister } from "@/app/first-login/actions"; // 既存のアクションを再利用
import { Loader2, ArrowRight, CheckCircle2, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
    const router = useRouter();
    const [step, setStep] = useState<'email' | 'details'>('email');
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    // Step 1: メール送信 (OTP)
    const handleSendOtp = async (formData: FormData) => {
        setLoading(true);
        setError("");
        setMessage("");

        const res = await sendOtp(formData);

        setLoading(false);
        if (res.error) {
            setError(res.error);
        } else {
            setEmail(formData.get("email") as string);
            setStep('details');
            setMessage("認証コードを送信しました。メールを確認してください。");
        }
    };

    // Step 2: 登録完了 (パスワード設定)
    const handleRegister = async (formData: FormData) => {
        setLoading(true);
        setError("");

        formData.append("email", email);
        // 名前は事前登録されている場合もありますが、本人が修正・確定できるように入力させます
        const res = await verifyAndRegister(formData);

        if (res.error) {
            setLoading(false);
            setError(res.error);
        } else {
            router.push("/portal");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <Card className="w-full max-w-md border-t-4 border-t-blue-600 shadow-lg">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">アカウント利用開始</CardTitle>
                    <CardDescription className="text-center">
                        {step === 'email'
                            ? "ご契約時、または招待されたメールアドレスを入力してください。"
                            : "メールに届いた認証コードと、パスワードを設定してください。"}
                    </CardDescription>
                </CardHeader>
                <CardContent>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-md border border-green-200 flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            {message}
                        </div>
                    )}

                    {step === 'email' ? (
                        <form action={handleSendOtp} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">メールアドレス</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                認証コードを受け取る
                            </Button>
                        </form>
                    ) : (
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
                                    className="text-center text-lg tracking-widest font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fullName">氏名</Label>
                                <Input
                                    id="fullName"
                                    name="fullName"
                                    placeholder="山田 太郎"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">パスワード設定</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="8文字以上"
                                    required
                                    minLength={8}
                                />
                            </div>

                            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                登録を完了してログイン
                            </Button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setStep('email')}
                                    className="text-sm text-gray-500 hover:underline"
                                >
                                    戻る
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-6 text-center text-sm border-t pt-4">
                        <span className="text-gray-500">アカウントをお持ちの方は </span>
                        <Link href="/login" className="font-medium text-blue-600 hover:underline">
                            ログイン
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}