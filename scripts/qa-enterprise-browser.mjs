/**
 * エンタープライズ拡張 ブラウザ動作確認（ローカル）
 * 実行: node scripts/qa-enterprise-browser.mjs
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const PASSWORD = 'LocalDev#2026'
const CHROMIUM = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium-browser'

const results = []

function pass(name, detail = '') {
  results.push({ name, ok: true, detail })
  console.log(`✅ ${name}${detail ? `: ${detail}` : ''}`)
}

function fail(name, detail = '') {
  results.push({ name, ok: false, detail })
  console.log(`❌ ${name}${detail ? `: ${detail}` : ''}`)
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByLabel(/メール|email/i).fill(email)
  await page.getByLabel(/パスワード|password/i).fill(PASSWORD)
  await page.getByRole('button', { name: /ログイン|sign in/i }).click()
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 30000 })
}

async function main() {
  let browser
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: CHROMIUM,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  } catch (e) {
    console.error('Chromium 起動失敗:', e.message)
    process.exit(2)
  }

  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await login(page, 'sample2@example.test')

    await page.goto(`${BASE}/adm/one-on-one`, { waitUntil: 'networkidle', timeout: 60000 })
    const body1 = await page.locator('body').innerText()
    if (body1.includes('予定登録')) pass('1on1 管理画面', '予定登録ボタン表示')
    else fail('1on1 管理画面', '予定登録ボタンが見つからない')
    if (body1.includes('QA: 次回1on1') || body1.includes('予定中の 1on1')) pass('1on1 予定一覧', 'QA予定または予定パネル表示')
    else fail('1on1 予定一覧', '予定データ未表示')
    if (body1.includes('AI要約') || body1.includes('要約') || body1.includes('QA: 目標進捗確認')) pass('1on1 AI要約 UI', '要約またはQAセッション表示')
    else fail('1on1 AI要約 UI', 'セッション/要約UI未確認')

    await page.goto(`${BASE}/adm/hr-kpi`, { waitUntil: 'networkidle', timeout: 60000 })
    const bodyKpi = await page.locator('body').innerText()
    if (bodyKpi.includes('イベントRSVP') || bodyKpi.includes('RSVP回答率')) pass('hr-kpi RSVP KPI', bodyKpi.match(/[\d.]+%/)?.[0] ?? 'ラベル表示')
    else fail('hr-kpi RSVP KPI', 'KPIラベル未表示')

    await page.goto(`${BASE}/adm/evaluation/workflow`, { waitUntil: 'networkidle', timeout: 60000 })
    const bodyEval = await page.locator('body').innerText()
    if (!bodyEval.includes('403') && !bodyEval.includes('権限がありません')) pass('評価ワークフロー', '画面表示')
    else fail('評価ワークフロー', 'アクセス不可')

    await context.clearCookies()
    await login(page, 'sample@example.test')
    await page.goto(`${BASE}/my-one-on-one`, { waitUntil: 'networkidle', timeout: 60000 })
    const bodyMy = await page.locator('body').innerText()
    if (bodyMy.includes('QA: 次回1on1') || bodyMy.includes('予定されている 1on1')) pass('従業員 my-one-on-one', '予定表示')
    else fail('従業員 my-one-on-one', '予定未表示')
    if (bodyMy.includes('キャリア相談') || bodyMy.includes('アジェンダ')) pass('従業員 アジェンダ', '事前共有テキスト表示')
    else fail('従業員 アジェンダ', 'アジェンダ本文未確認')
  } catch (e) {
    fail('実行エラー', e.message)
  } finally {
    await browser.close()
  }

  const failed = results.filter(r => !r.ok)
  console.log('\n--- サマリー ---')
  console.log(`成功: ${results.filter(r => r.ok).length} / ${results.length}`)
  if (failed.length) {
    console.log('失敗:', failed.map(f => f.name).join(', '))
    process.exit(1)
  }
}

main()
