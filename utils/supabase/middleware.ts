import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 現在のパス
    const path = request.nextUrl.pathname;

    // ▼▼▼ アクセス許可リスト（ログイン不要でアクセスできるパス） ▼▼▼
    const publicPaths = [
        "/login",
        "/auth",
        "/signup",
        "/first-login",
        "/forgot-password",
        "/developer/companies/add" // ★ここが会社登録画面
    ];

    // ユーザーがおらず、かつ「許可リスト」のいずれでも始まらないパスへのアクセスならリダイレクト
    if (
        !user &&
        !publicPaths.some(publicPath => path.startsWith(publicPath))
    ) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}