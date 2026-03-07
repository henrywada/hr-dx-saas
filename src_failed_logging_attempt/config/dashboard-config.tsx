import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  FileText, 
  Settings, 
  LucideIcon 
} from 'lucide-react';

export interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
}

export interface DashboardCard {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: LucideIcon;
  color: string;
}

// 左サイドメニューの定義
export const SIDEBAR_MENU: MenuItem[] = [
  { label: 'ダッシュボード', href: '/top', icon: LayoutDashboard, active: true },
];

// ダッシュボードのメインコンテンツ（カード）の定義
// ご要望に合わせてラベルを置換しました。
// 1. 「従業員登録」→「テナント数」
// 2. 「稼働プロジェクト」→「登録ユーザ数」
// 3. 「今月の経営申請」→「公開・サービス数」
// 4. 「システム稼働率」→「未公開・サービス数」
export const DASHBOARD_CARDS: DashboardCard[] = [
  { 
    title: 'テナント数', 
    value: '142社', 
    trend: '+4社 (先月比)', 
    trendUp: true, 
    icon: Users,
    color: 'bg-blue-500'
  },
  { 
    title: '登録ユーザ数', 
    value: '1,250名', 
    trend: '+24名 (先月比)', 
    trendUp: true, 
    icon: FolderKanban,
    color: 'bg-accent-orange' 
  },
  { 
    title: '公開・サービス数', 
    value: '12件', 
    trend: '安定', 
    trendUp: true, 
    icon: FileText,
    color: 'bg-green-500'
  },
  { 
    title: '未公開・サービス数', 
    value: '3件', 
    trend: '開発中', 
    trendUp: false, 
    icon: Settings,
    color: 'bg-purple-500'
  },
];