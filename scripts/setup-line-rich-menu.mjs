// scripts/setup-line-rich-menu.mjs
//
// LINE公式アカウントのリッチメニューを作成し、全ユーザーへのデフォルト適用まで行う。
// 一度実行すればよい運用スクリプト。実行前に以下を用意すること:
//   - 環境変数 LINE_CHANNEL_ACCESS_TOKEN, NEXT_PUBLIC_LIFF_ID
//   - リッチメニュー画像（推奨サイズ 2500x843px, PNG/JPEG, 1MB以下）へのパス
//
// 実行方法（hr-dx-saas）:
//   LINE_CHANNEL_ACCESS_TOKEN=xxx NEXT_PUBLIC_LIFF_ID=yyy \
//     node scripts/setup-line-rich-menu.mjs ./path/to/richmenu-image.png
//
// このスクリプトは LINE Messaging API を呼び出す。
// 本番・検証環境のトークンと LIFF ID を確認してから実行すること。
// 実行後、LINE Developers コンソールでリッチメニューの確認を行うこと。

import { readFile } from 'node:fs/promises'

const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
const liffId = process.env.NEXT_PUBLIC_LIFF_ID
const imagePath = process.argv[2]

// 必須の環境変数チェック
if (!channelAccessToken || !liffId) {
  console.error('LINE_CHANNEL_ACCESS_TOKEN と NEXT_PUBLIC_LIFF_ID を環境変数で指定してください')
  process.exit(1)
}
if (!imagePath) {
  console.error('使い方: node scripts/setup-line-rich-menu.mjs <画像ファイルパス>')
  process.exit(1)
}

/**
 * リッチメニューを作成する。
 * URI はパス無しの LIFF URL（/liff ルータが entry へ振るため）。
 * @returns {Promise<string>} 作成されたリッチメニューの ID
 */
async function createRichMenu() {
  const res = await fetch('https://api.line.me/v2/bot/richmenu', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      size: { width: 2500, height: 843 },
      selected: true,
      // hr-dx SaaS 用のメニュー名
      name: 'hr-dx default menu',
      // チャット画面下部のメニューバーのテキスト
      chatBarText: 'メニュー',
      areas: [
        {
          // メニュー全体をタップエリアとして設定
          bounds: { x: 0, y: 0, width: 2500, height: 843 },
          // パス無しの LIFF URL: /liff ルータが /liff/entry へ振る
          action: { type: 'uri', uri: `https://liff.line.me/${liffId}` },
        },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`リッチメニュー作成に失敗しました: ${res.status} ${await res.text()}`)
  }

  const { richMenuId } = await res.json()
  return richMenuId
}

/**
 * リッチメニューに画像をアップロードする。
 * @param {string} richMenuId
 */
async function uploadImage(richMenuId) {
  const imageBuffer = await readFile(imagePath)
  const contentType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg'

  const res = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: imageBuffer,
  })

  if (!res.ok) {
    throw new Error(`画像アップロードに失敗しました: ${res.status} ${await res.text()}`)
  }
}

/**
 * 作成したリッチメニューを全ユーザーのデフォルトとして適用する。
 * @param {string} richMenuId
 */
async function setDefault(richMenuId) {
  const res = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${channelAccessToken}` },
  })

  if (!res.ok) {
    throw new Error(`デフォルト適用に失敗しました: ${res.status} ${await res.text()}`)
  }
}

// メイン処理
const richMenuId = await createRichMenu()
console.log(`リッチメニューを作成しました: ${richMenuId}`)

await uploadImage(richMenuId)
console.log('画像をアップロードしました')

await setDefault(richMenuId)
console.log('全ユーザーのデフォルトリッチメニューとして適用しました')
