/**
 * AIエージェント系画面のレイアウト
 * 子要素をそのまま表示（余計なラッパーはレイアウト崩れの原因になるため省略）
 */
export default function AIAgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
