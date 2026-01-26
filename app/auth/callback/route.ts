import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");

  // 招待リンクの場合は /signup へ、それ以外は /portal へ
  const defaultNext = type === "invite" ? "/signup" : "/portal";
  const next = requestUrl.searchParams.get("next") ?? defaultNext;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    } else {
      console.error("Auth Callback Error:", error);
      return NextResponse.redirect(
        `${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/login`);
}
