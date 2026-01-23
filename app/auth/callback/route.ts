import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // URLから認証コード(code)やリダイレクト先(next)を取得
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/portal";

  if (code) {
    // 認証コードがある場合、サーバー側でセッション(Cookie)と交換する
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 成功したら、指定されたページ（デフォルトは/portal）へ転送
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } else {
        // エラー詳細をログ出力
        console.error("Auth Callback Error:", error);
        // エラー内容をパラメータとして渡してログイン画面へ
        return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`);
    }
  } else {
      console.warn("Auth Callback: No code provided");
  }

  // 認証コードがない、またはエラーの場合はログイン画面に戻す
  // ※URLに #access_token がついている（Implicit Flow）場合もここに来ますが、
  // サーバー側ではハッシュ(#)を読めないため、一旦ログイン画面に戻します。
  // 本来はPKCEフロー(code)が推奨されます。
  return NextResponse.redirect(`${requestUrl.origin}/login`);
}