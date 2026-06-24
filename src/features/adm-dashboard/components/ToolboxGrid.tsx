import {
  Calculator,
  ShieldAlert,
  FileText,
  Wallet,
  TrendingDown,
  FileSignature,
  Coins,
  Plus,
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

/** 業務効率化ツール集。すべて未実装のため「準備中」表示・クリック不可。 */
export function ToolboxGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {TOOLS.map(tool => {
        const Icon = tool.icon
        return (
          <div
            key={tool.label}
            className="flex cursor-default flex-col items-center justify-center gap-2 rounded-lg border border-[#e2e6ec] bg-white p-4 text-center shadow-xs"
          >
            <Icon className="h-5 w-5 text-[#57606a]" />
            <span className="text-xs font-medium text-[#161b22]">{tool.label}</span>
            <Badge variant="neutral" className="px-2 py-0.5 text-[10px]">
              準備中
            </Badge>
          </div>
        )
      })}
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="flex cursor-not-allowed flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#e2e6ec] p-4 text-center text-[#57606a]"
      >
        <Plus className="h-5 w-5" />
        <span className="text-xs font-medium">ツールを追加</span>
      </button>
    </div>
  )
}
