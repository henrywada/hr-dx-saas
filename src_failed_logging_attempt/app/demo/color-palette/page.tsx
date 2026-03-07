import React from 'react';
import { Button, Card, Badge } from '@/components/ui';

/**
 * カラーパレットのデモページ
 * 
 * 統一されたカラーパレットを使用したコンポーネントの使用例を表示
 */
export default function ColorPaletteDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            カラーパレット デモ
          </h1>
          <p className="text-gray-600">
            統一されたカラーパレットを使用したUIコンポーネント
          </p>
        </div>

        {/* カラーパレット */}
        <Card title="カラーパレット" variant="default">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Primary */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Primary</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-primary rounded-lg shadow-md"></div>
                  <div>
                    <p className="font-mono text-sm">#0055FF</p>
                    <p className="text-xs text-gray-500">Primary</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-primary-dark rounded-lg shadow-md"></div>
                  <div>
                    <p className="font-mono text-sm">#0044CC</p>
                    <p className="text-xs text-gray-500">Primary Dark</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-primary-light rounded-lg shadow-md"></div>
                  <div>
                    <p className="font-mono text-sm">#E5EBFF</p>
                    <p className="text-xs text-gray-500">Primary Light</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Accent Teal */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Accent Teal</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-accent-teal rounded-lg shadow-md"></div>
                  <div>
                    <p className="font-mono text-sm">#00C2B8</p>
                    <p className="text-xs text-gray-500">二次ボタン</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Accent Orange */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">Accent Orange</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-accent-orange rounded-lg shadow-md"></div>
                  <div>
                    <p className="font-mono text-sm">#FF6B00</p>
                    <p className="text-xs text-gray-500">警告・注意</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ボタン */}
        <Card title="ボタン" variant="primary">
          <div className="space-y-6">
            {/* サイズバリエーション */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">サイズバリエーション</h4>
              <div className="flex flex-wrap gap-4 items-center">
                <Button variant="primary" size="sm">小サイズ</Button>
                <Button variant="primary" size="md">中サイズ</Button>
                <Button variant="primary" size="lg">大サイズ</Button>
              </div>
            </div>

            {/* バリアント */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">バリアント</h4>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="outline">Outline</Button>
              </div>
            </div>

            {/* 状態 */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">状態</h4>
              <div className="flex flex-wrap gap-4">
                <Button variant="primary">通常</Button>
                <Button variant="primary" disabled>無効</Button>
              </div>
            </div>

            {/* フルWidth */}
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">フルWidth</h4>
              <Button variant="primary" fullWidth>フルWidthボタン</Button>
            </div>
          </div>
        </Card>

        {/* カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card variant="primary" title="重要なお知らせ">
            <p>Primary バリアントのカードです。重要な情報を表示します。</p>
          </Card>

          <Card variant="accent-teal" title="処理中">
            <p>Accent Teal バリアントのカードです。進行中の情報を表示します。</p>
          </Card>

          <Card variant="accent-orange" title="要注意">
            <p>Accent Orange バリアントのカードです。注意が必要な情報を表示します。</p>
          </Card>

          <Card variant="default" title="通常のカード">
            <p>Default バリアントのカードです。一般的な情報を表示します。</p>
          </Card>
        </div>

        {/* バッジ */}
        <Card title="バッジ" variant="accent-teal">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">ステータスバッジ</h4>
              <div className="flex flex-wrap gap-3">
                <Badge variant="primary">アクティブ</Badge>
                <Badge variant="teal">処理中</Badge>
                <Badge variant="orange">要注意</Badge>
                <Badge variant="neutral">通常</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 mb-3">使用例</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">ユーザーステータス:</span>
                  <Badge variant="primary">オンライン</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">タスクステータス:</span>
                  <Badge variant="teal">進行中</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">アラート:</span>
                  <Badge variant="orange">期限間近</Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 実用例 */}
        <Card title="実用例: ダッシュボードカード" variant="default">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 統計カード */}
            <div className="bg-primary-light p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-primary font-semibold">総ユーザー数</h4>
                <Badge variant="primary">+12%</Badge>
              </div>
              <p className="text-3xl font-bold text-primary">1,234</p>
              <p className="text-sm text-gray-600 mt-2">前月比</p>
            </div>

            <div className="bg-accent-teal/10 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-accent-teal font-semibold">アクティブセッション</h4>
                <Badge variant="teal">リアルタイム</Badge>
              </div>
              <p className="text-3xl font-bold text-accent-teal">567</p>
              <p className="text-sm text-gray-600 mt-2">現在接続中</p>
            </div>

            <div className="bg-accent-orange/10 p-6 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-accent-orange font-semibold">要対応タスク</h4>
                <Badge variant="orange">緊急</Badge>
              </div>
              <p className="text-3xl font-bold text-accent-orange">23</p>
              <p className="text-sm text-gray-600 mt-2">期限: 今日</p>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Button variant="primary">詳細を表示</Button>
            <Button variant="outline">レポート出力</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
