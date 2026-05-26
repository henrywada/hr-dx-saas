import Link from 'next/link'

export default function SignupCompletePage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">お申し込みありがとうございます</h1>
      <p className="text-gray-600 mb-6">
        ご登録のメールアドレスにパスワード設定メールをお送りしました。
        <br />
        メールをご確認のうえ、72時間以内にパスワードを設定してください。
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-6">
        メールが届かない場合は、迷惑メールフォルダをご確認ください。
      </div>

      <Link
        href="/login"
        className="inline-block px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
      >
        ログイン画面へ
      </Link>
    </div>
  )
}
