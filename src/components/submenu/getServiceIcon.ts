import {
  QrCode,
  Clock,
  CheckCircle,
  Laptop,
  FileText,
  BarChart3,
  Users,
  AlertCircle,
  Settings,
  Zap,
  Package,
  LucideIcon,
  Brain,
  TrendingUp,
  Award,
  Shield,
  Download,
  HeartHandshake,
  UserPlus,
  LayoutGrid,
} from 'lucide-react'

/** どのパターンにもマッチしないサービス名に対して使う既定アイコン（カード間のデザイン統一のため） */
const DEFAULT_ICON: LucideIcon = LayoutGrid

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  qr_attendance: QrCode,
  attendance: Clock,
  approval: CheckCircle,
  remote_work: Laptop,
  survey: FileText,
  stress_check: BarChart3,
  employee: Users,
  alert: AlertCircle,
  settings: Settings,
  recruitment: Zap,
  learning: Package,
  overtime: Clock,
  division: Users,
}

const SERVICE_NAME_PATTERN_MAP: Array<[RegExp, LucideIcon]> = [
  [/qr|二次元|qrコード|スキャン/i, QrCode],
  [/出退勤|勤怠|打刻|出退|ログ|csvデータ|csv|実績|インポート/i, Clock],
  [/承認|決裁|申請|書類|確認|登録|表示/i, CheckCircle],
  [/リモート|テレワーク|在宅|pc|デバイス|ペアリング/i, Laptop],
  [/アンケート|調査|サーベイ|パルス|質問|questionnaire/i, FileText],
  [/ストレス|メンタル|高ストレス|面接指導|スクリーニング/i, BarChart3],
  [/従業員|人事|管理|組織|スタッフ/i, Users],
  [/残業|時間外|超勤|オーバー|36協定|労使協定|勤務時間|リスク|コンプライアンス|遵守/i, Shield],
  [/AI|自動|スマート|改善|支援|最適化/i, Brain],
  [/分析|結果|レポート|データ|月次|締め|評価|ダッシュボード|dashboard/i, TrendingUp],
  [/スキル|育成|学習|ラーニング|eラーニング|成長|コース/i, Award],
  [/ダウンロード|エクスポート|出力|export/i, Download],
  [/相談|sos|悩み|カウンセリング/i, HeartHandshake],
  [/リファラル|推薦|紹介|referral/i, UserPlus],
]

export function getServiceIcon(
  category: string | null | undefined,
  serviceName?: string | null
): LucideIcon {
  if (category) {
    const icon = CATEGORY_ICON_MAP[category.toLowerCase()]
    if (icon) return icon
  }

  if (serviceName) {
    for (const [pattern, icon] of SERVICE_NAME_PATTERN_MAP) {
      if (pattern.test(serviceName)) {
        return icon
      }
    }
  }

  // どのパターンにもマッチしない場合も既定アイコンを返し、カードのデザインを統一する
  return DEFAULT_ICON
}
