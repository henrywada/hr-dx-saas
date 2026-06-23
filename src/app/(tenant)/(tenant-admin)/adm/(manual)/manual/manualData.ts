/** マニュアル集：カテゴリー別の項目（タイトル・本文は src/content/help/markdown を参照） */

import { ATT_QR_DISPLAY_TITLE } from '@/content/help/entryMeta'

export type ManualEntry = {
  id: string
  title: string
}

export type ManualCategory = {
  id: string
  name: string
  description: string
  accentClass: string
  entries: ManualEntry[]
}

export const MANUAL_CATEGORIES: ManualCategory[] = [
  {
    id: 'recruitment',
    name: '採用支援',
    description: '求人・AI生成・媒体連携など、採用業務に関する操作の目安です。',
    accentClass: 'from-indigo-500 to-indigo-600',
    entries: [
      {
        id: 'rec-job-basic',
        title: '求人票の登録・編集の流れ',
      },
      {
        id: 'rec-ai-draft',
        title: 'AI求人票生成の使い方',
      },
      {
        id: 'rec-media',
        title: '求人票メディア連携（外部掲載）',
      },
      {
        id: 'rec-hellowork',
        title: 'ハローワーク連携・エクスポート',
      },
      {
        id: 'rec-offer-validation',
        title: '内定・オファー確認（バリデーション）',
      },
    ],
  },
  {
    id: 'pulse',
    name: 'パルスサーベイ',
    description: '短周期の職場サーベイの設定と結果の見方です。',
    accentClass: 'from-teal-500 to-cyan-600',
    entries: [
      {
        id: 'pulse-overview',
        title: 'パルスサーベイの目的と運用サイクル',
      },
      {
        id: 'pulse-period',
        title: '調査期間の設定',
      },
      {
        id: 'pulse-dashboard',
        title: 'ダッシュボードの見方',
      },
    ],
  },
  {
    id: 'stress',
    name: 'ストレスチェック',
    description: '実施管理から集計・フォローまでの管理者向けガイドです。',
    accentClass: 'from-orange-500 to-amber-600',
    entries: [
      {
        id: 'stress-flow',
        title: '実施スケジュールと全体の流れ',
      },
      {
        id: 'stress-progress',
        title: '回答状況・進捗の確認',
      },
      {
        id: 'stress-high',
        title: '高ストレス者へのフォロー（面接・記録）',
      },
      {
        id: 'stress-survey-dash',
        title: '組織健康度（サーベイ）ダッシュボードとの関係',
      },
    ],
  },
  {
    id: 'attendance',
    name: '勤怠管理',
    description: 'QR打刻・閾値設定・テレワーク端末など勤怠まわりの操作です。',
    accentClass: 'from-blue-500 to-sky-600',
    entries: [
      {
        id: 'att-attendance-three-methods',
        title: '勤怠管理の3つのデータ取得方法：仕組みと使い方ガイド',
      },
      {
        id: 'att-qr',
        title: ATT_QR_DISPLAY_TITLE,
      },
      {
        id: 'att-qr-perm',
        title: 'QR表示権限の付与とCSV一括登録',
      },
      {
        id: 'att-overtime',
        title: '残業閾値の設定',
      },
      {
        id: 'att-telework',
        title: 'テレワーク（PC）出退勤と端末ペアリング',
      },
    ],
  },
  {
    id: 'settings',
    name: '基本設定',
    description: 'マスタ・お知らせ・契約サービスなど、基盤となる設定です。',
    accentClass: 'from-slate-600 to-slate-700',
    entries: [
      {
        id: 'set-org',
        title: '組織・従業員マスタの整備',
      },
      {
        id: 'set-divisions',
        title: '部署の追加・変更',
      },
      {
        id: 'set-announce',
        title: 'お知らせの掲載',
      },
      {
        id: 'set-service-assign',
        title: 'サービス割当（テナント契約と表示）',
      },
    ],
  },
  {
    id: 'other',
    name: 'その他',
    description: 'セキュリティ・利用上の注意・問い合わせなどです。',
    accentClass: 'from-violet-500 to-purple-600',
    entries: [
      {
        id: 'oth-security',
        title: 'アカウントと権限の取り扱い',
      },
      {
        id: 'oth-data',
        title: '個人情報・機密情報の取り扱い',
      },
      {
        id: 'oth-browser',
        title: '推奨環境と表示の不具合',
      },
      {
        id: 'oth-support',
        title: '問い合わせ・障害連絡',
      },
    ],
  },
]
