'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

/** スマホの設定・操作での注意点（丁寧語）をモーダル表示するトリガー付き（/adm/manual の AttendanceMethodsModal と同系デザイン） */
export function QrPunchMobileTipsModalTrigger({
  className,
  label = 'スマホの注意点',
}: {
  className?: string
  label?: string
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'min-h-10 max-w-[88px] shrink-0 rounded-xl border border-white/40 bg-white/10 px-2 text-center text-[11px] font-bold leading-tight text-white sm:max-w-none sm:px-3 sm:text-xs',
            className,
          )}
        >
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-[800px] flex flex-col gap-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-lg [&>button]:text-white [&>button]:hover:bg-white/15 [&>button]:hover:text-white [&>button]:focus-visible:ring-white/40">
        <DialogHeader className="rounded-t-lg border-0 bg-sky-600 px-6 pb-4 pt-5 pr-14 text-white sm:px-8 sm:pb-5 sm:pt-6 sm:pr-16">
          <DialogTitle className="text-lg font-semibold text-white sm:text-xl">
            スマホの設定・操作での注意点
          </DialogTitle>
          <DialogPrimitive.Description className="sr-only">
            QR 打刻時のカメラ・位置情報・端末設定に関する注意事項です。
          </DialogPrimitive.Description>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 text-sm text-gray-700 leading-7 sm:px-8 sm:py-6 sm:text-[0.9375rem] [scrollbar-gutter:stable] [&_strong]:font-semibold [&_strong]:text-gray-900">
          <SectionTitle>共通</SectionTitle>
          <BulletList>
            <li>
              <strong>正規の URL（https）</strong>
              でアクセスしてください。HTTP のみのページでは位置情報が利用できず、打刻できない場合がございます。
            </li>
            <li>
              <strong>カメラ</strong>と<strong>位置情報（GPS）</strong>
              の両方について、ブラウザ（またはサイト）に対して<strong>許可</strong>いただくようお願いいたします。
            </li>
            <li>
              打刻の直前は、可能であれば <strong>GPS をオン</strong>にし、
              <strong>屋外や窓際</strong>など電波が取りやすい場所でお試しください。
            </li>
            <li>
              <strong>省電力モード</strong>や<strong>位置情報の精度を下げる設定</strong>
              が有効な機種では、位置がずれたり、「精度不足」と判定される場合がございます。
            </li>
          </BulletList>

          <SectionTitle>監督者（QR を表示される側）</SectionTitle>
          <BulletList>
            <li>
              QR を表示するたびに位置情報を利用いたしますので、
              <strong>位置情報の許可を「使用中のみ」または「許可」</strong>
              に設定いただくようお願いいたします。
            </li>
            <li>
              許可ダイアログで<strong>拒否</strong>された場合は、ブラウザの
              <strong>サイト設定</strong>から再度オンにしていただく必要がございます。
            </li>
            <li>
              <strong>画面の向き</strong>
              によってカメラや画面が見づらくならないよう、端末の置き方・向きにご留意ください。
            </li>
          </BulletList>

          <SectionTitle>従業員（スキャンされる側）</SectionTitle>
          <BulletList>
            <li>
              <strong>「スキャン開始」</strong>
              後にカメラが起動いたしますので、その際に<strong>カメラの許可</strong>
              をいただくようお願いいたします。
            </li>
            <li>
              QR コードは<strong>枠内に収まる距離</strong>でかざしてください。暗い場所では
              <strong>画面の明るさ</strong>や<strong>反射</strong>にご注意ください。
            </li>
            <li>
              打刻処理の途中で<strong>アプリを閉じたり、タブを切り替えたりしない</strong>
              ようお願いいたします（処理に失敗したり、二重操作の原因となる場合がございます）。
            </li>
            <li>
              <strong>お一人お打刻のたびに QR が更新</strong>
              されますので、<strong>常に最新の QR コード</strong>
              を読み取ってください（以前の QR では「すでに使用済み」等となる場合がございます）。
            </li>
          </BulletList>

          <SectionTitle>iPhone（Safari をご利用の場合）</SectionTitle>
          <BulletList>
            <li>
              <strong>設定 → Safari → カメラ／位置情報</strong>
              より、当該サイトが許可されているかご確認ください。
            </li>
            <li>
              必要に応じて{' '}
              <strong>設定 → プライバシーとセキュリティ → 位置情報サービス</strong> をオンにしてください。
            </li>
          </BulletList>

          <SectionTitle>Android（Chrome をご利用の場合）</SectionTitle>
          <BulletList>
            <li>
              アドレスバーの<strong>鍵アイコン</strong>や<strong>メニュー（︙）→ 設定</strong>
              などから、<strong>カメラ・位置情報</strong>を許可してください。
            </li>
            <li>
              <strong>Chrome の位置情報</strong>に加え、端末の
              <strong>位置情報サービス（GPS）</strong>がオフのままですと、位置が取得できない場合がございます。
            </li>
          </BulletList>

          <SectionTitle>その他</SectionTitle>
          <BulletList>
            <li>
              <strong>プライベートブラウズ／シークレット</strong>
              でもご利用いただけることが多くございますが、権限の確認が毎回表示されたり、制限がかかる場合がございます。その際は
              <strong>通常モード</strong>でのお試しをお願いいたします。
            </li>
            <li>
              <strong>VPN</strong>や<strong>広告ブロック</strong>
              の拡張機能をご利用の場合、位置情報や通信が不安定になる場合がございます。
            </li>
          </BulletList>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** AttendanceMethodsModal の markdown h3 と同じ（左インディゴボーダー＋薄い青背景） */
function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 mt-4 rounded-md border-l-4 border-indigo-400 bg-indigo-50 px-3 py-2 text-base font-semibold text-gray-900 first:mt-0">
      {children}
    </h3>
  )
}

function BulletList({ children }: { children: ReactNode }) {
  return (
    <ul className="mb-4 list-disc pl-6 text-gray-700 leading-7 last:mb-0 [&>li]:text-gray-700 [&>li]:leading-7 [&>li]:[&>p]:mb-0">
      {children}
    </ul>
  )
}
