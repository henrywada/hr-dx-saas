"use client";

import { login, signup } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useActionState, Suspense } from "react";
import { Loader2 } from "lucide-react";

function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <Card className="w-[350px] shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">ログイン</CardTitle>
        <CardDescription className="text-center">
          IDとパスワードを入力してください
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="grid gap-4 pb-8">
          <div className="grid gap-2">
            <Label htmlFor="email">ログインID (メールアドレス)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">パスワード</Label>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
            />
          </div>

          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4"
            >
              パスワードを忘れたらここ
            </Link>
          </div>

          {state?.error && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 font-medium text-center">
                {state.error}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full font-bold text-base h-11" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ログイン中...
              </>
            ) : (
              "ログイン"
            )}
          </Button>

          <Button formAction={signup} variant="ghost" className="w-full text-xs text-muted-foreground" disabled={isPending}>
            新規登録 (開発用)
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}