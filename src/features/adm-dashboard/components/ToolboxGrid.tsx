import {
  Package,
  Calculator,
  ShieldAlert,
  FileText,
  Wallet,
  TrendingDown,
  FileSignature,
  Coins,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

const TOOLS = [
  { label: '残業代計算', icon: Calculator },
  { label: '36協定チェッカー', icon: ShieldAlert },
  { label: '通知文テンプレ', icon: FileText },
  { label: '有給残数計算', icon: Wallet },
  { label: '離職率シミュ', icon: TrendingDown },
  { label: '雇用契約書生成', icon: FileSignature },
  { label: '賞与試算', icon: Coins },
] as const

/** 業務効率化ツール集。すべて未実装のためクリック不可（タイル自体には個別の状態表示は出さない）。 */
export function ToolboxGrid() {
  return (
    <div className="rounded-lg border border-[#e2e6ec] bg-white p-5 shadow-xs">
      <div className="flex items-start gap-2">
        <div className="shrink-0 rounded-md bg-[#fff3e6] p-2 text-[#FD7601]">
          <Package className="h-4 w-4" />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#161b22]">業務効率化ツール集</h3>
            <span className="ml-auto rounded-full bg-[#e8f0fe] px-2 py-0.5 text-[10px] font-medium text-[#1a56db]">
              NEW
            </span>
          </div>
          <p className="text-xs leading-relaxed text-[#57606a]">
            人事担当者が日常的に使う計算・生成・変換ツールをまとめたユーティリティ集。
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {TOOLS.map(tool => {
          const Icon = tool.icon
          return (
            <div
              key={tool.label}
              className="flex cursor-default items-center gap-2 rounded-lg border border-[#e2e6ec] bg-white p-3 text-left"
            >
              <Icon className="h-4 w-4 shrink-0 text-[#57606a]" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[#161b22]">{tool.label}</span>
                <Badge variant="neutral" className="self-start px-2 py-0.5 text-[10px]">
                  準備中
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
