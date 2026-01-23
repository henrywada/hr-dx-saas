'use server';

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export type State = {
    error?: string;
    success?: boolean;
    message?: string;
};

// 1. ワンタイムパスワード (OTP) を送信する
export async function sendOtp(formData: FormData): Promise<State> {
    const supabase = await createClient();
    const email = formData.get("email") as string;

    if (!email) return { error: "メールアドレスを入力してください。" };

    // OTP送信 (サインアップではなく、既存ユーザーへのサインインとして扱う)
    // ※人事部が事前にユーザーを作成している前提です。
    // shouldCreateUser: false にすることで、未登録のメールアドレスへの送信を防ぎます（セキュリティ対策）。
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: false,
            emailRedirectTo: 'http://localhost:3000/signup',
        },
    });

    if (error) {
        console.error("OTP Send Error:", error);
        // セキュリティのため、ユーザーが存在しない場合でも詳細なエラーは返さないのが一般的ですが、
        // 社内システムの場合は分かりやすさを優先してエラーを表示しても良いでしょう。
        return { error: "認証コードの送信に失敗しました。メールアドレスが登録されていない可能性があります。" };
    }

    return { success: true, message: "認証コードを送信しました。" };
}

// 2. OTPを検証し、パスワードとプロフィールを登録する
export async function verifyAndRegister(formData: FormData): Promise<State> {
    const supabase = await createClient();
    
    const email = formData.get("email") as string;
    const otp = formData.get("otp") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;

    // A. OTP検証またはセッション確認
    let session = null;
    let verifyError = null;

    // 既にログイン済み（リンク踏破など）かチェック
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // ログイン済みならOTP検証はスキップ
        session = { user }; // 簡易的なセッションオブジェクト
    } else {
        // 未ログインなら、複数のTypeを試行するロジックを実行
        if (!otp) return { error: "認証コードを入力してください。" }; // OTP必須

        // 1. まず 'invite' (招待) で試行
        // ※ リンクを踏まずにコード入力する場合、招待状態であれば type: 'invite' が正解
        const { data: d1, error: e1 } = await supabase.auth.verifyOtp({
            email, token: otp, type: 'invite',
        });
        if (!e1 && d1.session) {
            session = d1.session;
        } else {
            // 2. 失敗したら 'signup' (新規登録) で試行
            // ※ 自分自身で登録フローを開始した場合はこちら
            const { data: d2, error: e2 } = await supabase.auth.verifyOtp({
                email, token: otp, type: 'signup',
            });
            if (!e2 && d2.session) {
                session = d2.session;
            } else {
                // 3. それでもだめなら 'email' (マジックリンク/ログイン) で試行
                const { data: d3, error: e3 } = await supabase.auth.verifyOtp({
                    email, token: otp, type: 'email',
                });
                if (!e3 && d3.session) {
                    session = d3.session;
                } else {
                    verifyError = e1 || e2 || e3;
                }
            }
        }

        if (!session) {
            console.error("OTP Verify Error (All types failed)");
            return { error: "認証コードが正しくないか、有効期限が切れています。" };
        }
    }

    // B. パスワードの設定 (ログイン中なので自分のパスワードを更新できる)
    const { error: passwordError } = await supabase.auth.updateUser({
        password: password
    });

    if (passwordError) {
        return { error: "パスワードの設定に失敗しました: " + passwordError.message };
    }

    // C. 従業員テーブル (employees) への登録
    // employeesテーブルは id が auth.users.id を参照しているため、
    // セッションの user.id を使って登録します。
    // ※人事部が管理画面で既にemployeesレコードを作っている運用もあり得ますが、
    // ここでは「初めてログインするときに従業員情報を登録」という要件に従い Upsert (挿入または更新) します。
    
    // まず tenant_id を特定する必要があります。
    // 通常は招待時にメタデータに入れるか、管理者側でemployeesを作っておくのが定石ですが、
    // 今回は簡易的に「最初のテナント」または「特定のロジック」で割り当てる必要があります。
    // ここでは仮に、システム管理者によって事前に作成された "仮のemployeesレコード" があると仮定し、それを更新する形、
    // あるいは新規作成を試みます。
    
    // しかし、tenant_id が必須のカラムであるため、
    // 1. 招待メールを送る運用ではない (A案)
    // 2. 人事部が「メールだけ」登録済み
    // という状況下では、Authユーザー作成時に `user_metadata` に `tenant_id` を入れておく運用がベストです。
    // 今回は実装を止めないよう、もしメタデータにテナントIDがなければ、
    // 「デモ用テナント」または「エラー」として処理します。

    let tenantId = session.user.user_metadata?.tenant_id;

    if (!tenantId) {
        // フォールバック: 既存のemployeesレコードを探す（人事部が空レコードを作っていた場合）
        const { data: existingEmp } = await supabase
            .from("employees")
            .select("tenant_id")
            .eq("id", session.user.id)
            .single();
        
        if (existingEmp) {
            tenantId = existingEmp.tenant_id;
        } else {
            // ここで詰まらないように、デモ用の処理として
            // 「一番最初のテナント」を割り当てる、等の処置が必要かもしれません。
            // いったんエラーにします。
            // return { error: "所属テナント情報が見つかりません。管理者に問い合わせてください。" };
            
            // ★開発支援用の一時的処置: デモテナントIDをハードコードまたは取得
             const { data: demoTenant } = await supabase.from("tenants").select("id").limit(1).single();
             tenantId = demoTenant?.id;
        }
    }

    const { error: dbError } = await supabase
        .from("employees")
        .upsert({
            id: session.user.id,
            tenant_id: tenantId,
            name: fullName,
            email: email, // 念のため
            role: 'member', // デフォルトロール
        });

    if (dbError) {
        console.error("DB Register Error:", dbError);
        return { error: "従業員情報の登録に失敗しました。" };
    }

    // 成功したらリダイレクト（クライアント側でハンドリングするためここでは行わない、またはredirectを投げる）
    // Server Actions内でredirectするとtry-catchでキャッチできないことがあるため、成功フラグを返すパターンにします。
    return { success: true };
}

// 3. (Magic Link用) 認証済みユーザーの登録完了処理
// OTP検証を行わず、パスワード設定とプロフィール登録のみを行う
export async function completeRegistration(formData: FormData): Promise<State> {
    const supabase = await createClient();
    
    // 現在のセッションを確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: "ログインセッションが見つかりません。招待メールのリンクから再度アクセスしてください。" };
    }

    const email = user.email || formData.get("email") as string;
    const password = formData.get("password") as string;
    // fullNameは必須ではない形に変更（初期値: emailのアカウント名 or 'Employee'）
    let fullName = formData.get("fullName") as string;

    if (!password) {
        return { error: "パスワードを入力してください。" };
    }

    if (!fullName) {
         fullName = email ? email.split('@')[0] : 'Employee';
    }

    // A. パスワードの設定
    const { error: passwordError } = await supabase.auth.updateUser({
        password: password
    });

    if (passwordError) {
        return { error: "パスワードの設定に失敗しました: " + passwordError.message };
    }

    // B. 従業員テーブルへの登録
    let tenantId = user.user_metadata?.tenant_id;

    if (!tenantId) {
        // フォールバック
        const { data: existingEmp } = await supabase
            .from("employees")
            .select("tenant_id")
            .eq("id", user.id)
            .single();
        
        if (existingEmp) {
            tenantId = existingEmp.tenant_id;
        } else {
            // デモ用
             const { data: demoTenant } = await supabase.from("tenants").select("id").limit(1).single();
             tenantId = demoTenant?.id;
        }
    }

    const { error: dbError } = await supabase
        .from("employees")
        .upsert({
            id: user.id,
            tenant_id: tenantId,
            name: fullName,
            email: email, 
            role: 'member',
        });

    if (dbError) {
        console.error("DB Register Error:", dbError);
        return { error: "従業員情報の登録に失敗しました。" };
    }

    return { success: true };
}