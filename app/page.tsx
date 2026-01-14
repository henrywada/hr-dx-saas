import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  // 1. ログインしているかチェック
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // ログイン済みなら -> ポータル画面へ
    redirect("/portal");
  } else {
    // 未ログインなら -> ログイン画面へ転送
    redirect("/login");
  }
}