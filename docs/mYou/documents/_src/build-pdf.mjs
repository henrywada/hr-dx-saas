// mYou 設計書・マニュアルの md（_src）から PDF を生成する（Chromium ヘッドレス）。
//
// 使い方（リポジトリルートで実行）:
//   node docs/mYou/documents/_src/build-pdf.mjs <doc-key> <出力PDFパス>
//   例: node docs/mYou/documents/_src/build-pdf.mjs 04 docs/mYou/documents/04_操作マニュアル_ユーザー向けv03.pdf
//
// 表紙・改訂履歴・目次・ヘッダー/フッターを付与する。書式は v02 の PDF に合わせている。
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { micromark } from 'micromark'
import { gfm, gfmHtml } from 'micromark-extension-gfm'

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url))
const CHROMIUM = process.env.CHROMIUM_BIN || '/snap/bin/chromium'

// 文書ごとの表紙・ヘッダー情報
const DOCS = {
  '02': {
    md: '02_基本設計書.md',
    docNo: 'MYOU-BD-001',
    docName: '基本設計書',
    subtitle: '製品トレーサビリティ・有効期限管理システム',
    title: '基本設計書',
  },
  '04': {
    md: '04_操作マニュアル_ユーザー向け.md',
    docNo: 'MYOU-UM-001',
    docName: '操作マニュアル（ユーザー向け）',
    subtitle: '入荷・在庫・出荷・照会の日常操作',
    title: '操作マニュアル（ユーザー向け）',
  },
}
const COMMON = {
  customer: 'ミュー株式会社 御中',
  targetSystem: '製品トレーサビリティ機能',
  targetProduct: 'セルフィール MS（スプレー缶）',
  version: '第 1.0 版',
  issuedOn: '2026年7月29日',
  revisions: [{ version: '1.0', date: '2026年7月29日', note: '初版発行', by: '—' }],
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** 本文 md を HTML にし、h2/h3 から目次を作る */
function renderBody(markdown) {
  const toc = []
  // md 中の <!-- pagebreak --> を改ページとして扱う（空の区間は捨てる）
  const html = markdown
    .split(/<!--\s*pagebreak\s*-->/i)
    .filter(part => part.trim())
    .map(part => micromark(part, { extensions: [gfm()], htmlExtensions: [gfmHtml()] }))
    .join('<div class="pb"></div>')
    .replace(/<h([23])>(.*?)<\/h\1>/g, (_m, level, inner) => {
      toc.push({ level: Number(level), text: inner.replace(/<[^>]+>/g, '') })
      return `<h${level}>${inner}</h${level}>`
    })
  return { html, toc }
}

const CSS = `
@page { size: A4; margin: 20mm 16mm 20mm 16mm;
  @top-left { content: '__HEADER__'; font: 8pt 'Noto Sans CJK JP'; color: #666; vertical-align: top; padding-top: 8mm; }
  @bottom-left { content: '__FOOTER__'; font: 8pt 'Noto Sans CJK JP'; color: #666; }
  @bottom-right { content: '- ' counter(page) ' / ' counter(pages) ' -'; font: 8pt 'Noto Sans CJK JP'; color: #666; }
}
@page :first { @top-left { content: none } @bottom-left { content: none } @bottom-right { content: none } }
html { font-family: 'Noto Sans CJK JP', sans-serif; font-size: 10pt; color: #222; line-height: 1.7; }
body { margin: 0; }
h2, h3 { line-height: 1.4; }
h2 { font-size: 15pt; margin: 20pt 0 12pt; padding-bottom: 4pt; border-bottom: 2px solid #ccc; }
.pb { break-after: page; height: 0; }
h3 { font-size: 11.5pt; margin: 16pt 0 6pt; }
h4 { font-size: 10.5pt; margin: 12pt 0 4pt; }
p { margin: 4pt 0 8pt; }
ol, ul { margin: 4pt 0 8pt; padding-left: 18pt; }
li { margin: 1pt 0; }
table { border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 8.5pt; line-height: 1.55; break-inside: auto; }
tr { break-inside: avoid; }
th, td { border: 1px solid #d5d5d5; padding: 3pt 6pt; text-align: left; vertical-align: top; }
th { background: #f0f0f0; font-weight: 700; }
code { font-family: 'Noto Sans Mono CJK JP', monospace; font-size: 8.5pt; background: #f2f2f2; padding: 0 3pt; border-radius: 2px; }
pre { background: #f6f6f6; border: 1px solid #e0e0e0; padding: 6pt 8pt; font-size: 8pt; line-height: 1.5; white-space: pre-wrap; word-break: break-all; break-inside: avoid; }
pre code { background: none; padding: 0; font-size: 8pt; }
blockquote { margin: 8pt 0; padding: 6pt 16pt 6pt 12pt; background: #f4f8fb; border-left: 3px solid #4a90d9; }
blockquote p { margin: 2pt 0; }
.cover { break-after: page; padding-left: 5.5pt; }
.cover .no { letter-spacing: 0.5em; font-size: 9pt; color: #666; margin-top: -5pt; }
.cover .cust { margin-top: 82pt; font-size: 11.5pt; }
.cover .sub { margin-top: 26pt; font-size: 10.5pt; }
.cover .ttl { margin-top: 12pt; font-size: 28pt; font-weight: 700; line-height: 1.4; }
.cover .tgt { margin-top: 43pt; font-size: 9pt; line-height: 2.5; }
.cover table { width: 346pt; margin-top: 47pt; font-size: 9pt; }
.cover td, .cover th { padding: 7.5pt 8pt; }
.cover th { width: 96pt; }
.front h2 { break-before: auto; margin-top: 8pt; }
.toc { margin: 6pt 0; font-size: 9.5pt; line-height: 1.8; }
.toc .l2 { font-weight: 700; margin-top: 4pt; }
.toc .l3 { padding-left: 15pt; }
.front { break-after: page; }
`

function buildHtml(doc) {
  const markdown = fs.readFileSync(path.join(SRC_DIR, doc.md), 'utf-8')
  const { html, toc } = renderBody(markdown)
  const header = `${COMMON.customer} ／ ${doc.subtitle}`
  const footer = `${doc.docNo} ${doc.docName}`
  const tocHtml = toc.map(t => `<div class="l${t.level}">${esc(t.text)}</div>`).join('\n')
  const revRows = COMMON.revisions
    .map(
      r =>
        `<tr><td>${esc(r.version)}</td><td>${esc(r.date)}</td><td>${esc(r.note)}</td><td>${esc(r.by)}</td></tr>`
    )
    .join('')
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>${esc(doc.title)}</title>
<style>${CSS.replace('__HEADER__', header).replace('__FOOTER__', footer)}
</style></head><body>
<section class="cover">
  <div class="no">${doc.docNo.split('').join(' ')}</div>
  <div class="cust">${esc(COMMON.customer)}</div>
  <div class="sub">${esc(doc.subtitle)}</div>
  <div class="ttl">${esc(doc.title)}</div>
  <div class="tgt">対象システム：${esc(COMMON.targetSystem)}<br>対象製品：${esc(COMMON.targetProduct)}</div>
  <table>
    <tr><th>文書番号</th><td>${doc.docNo}</td></tr>
    <tr><th>版数</th><td>${esc(COMMON.version)}</td></tr>
    <tr><th>発行日</th><td>${esc(COMMON.issuedOn)}</td></tr>
  </table>
</section>
<section class="front">
  <h2>改訂履歴</h2>
  <table><tr><th>版数</th><th>改訂日</th><th>改訂内容</th><th>改訂者</th></tr>${revRows}</table>
  <h2 style="margin-top:22pt">目次</h2>
  <div class="toc">${tocHtml}</div>
</section>
${html}
</body></html>`
}

function main() {
  const [key, out] = process.argv.slice(2)
  const doc = DOCS[key]
  if (!doc || !out) {
    console.error(`使い方: node build-pdf.mjs <${Object.keys(DOCS).join('|')}> <出力PDFパス>`)
    process.exit(1)
  }
  // snap 版 Chromium はホーム配下しか読み書きできないため、一時 HTML はリポジトリ内に置く
  const tmpHtml = path.join(SRC_DIR, `.tmp-${key}.html`)
  fs.writeFileSync(tmpHtml, buildHtml(doc), 'utf-8')
  try {
    execFileSync(
      CHROMIUM,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--no-pdf-header-footer',
        `--print-to-pdf=${path.resolve(out)}`,
        `file://${tmpHtml}`,
      ],
      { stdio: 'inherit' }
    )
  } finally {
    fs.rmSync(tmpHtml, { force: true })
  }
  console.log(`出力: ${out}`)
}

main()
