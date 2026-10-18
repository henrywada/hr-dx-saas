/**
 * public スキーマの全テーブルをドメイン別に一覧化し、docs/db/table-catalog.md を生成するスクリプト
 *
 * 使用方法:
 *   npx tsx scripts/generate_table_catalog.ts
 *
 * - ローカル Supabase（127.0.0.1:55422）に SELECT のみを発行する（DB は一切変更しない）
 * - コード参照数は src / supabase/functions / scripts 配下の `.from('<table>')` を数える
 * - 新規テーブルを追加したら、必要に応じて DOMAIN_RULES に追記して再実行する
 */
import fs from 'node:fs'
import path from 'node:path'
import postgres from 'postgres'

const LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:55422/postgres'
const OUTPUT_PATH = 'docs/db/table-catalog.md'
const SCAN_DIRS = ['src', 'supabase/functions', 'scripts']
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs'])
const UNCLASSIFIED = '未分類'

type DomainRule = { domain: string; exact?: string[]; prefixes?: string[] }

// 上から順に評価する（exact を prefix より優先するため、個別指定は各ルールの exact に書く）
const DOMAIN_RULES: DomainRule[] = [
  {
    domain: 'テナント・契約・プラン・権限',
    exact: [
      'tenants',
      'tenant_contracts',
      'tenant_portal_settings',
      'tenant_service',
      'plan_config',
      'app_role',
      'app_role_service',
    ],
    prefixes: ['service'],
  },
  {
    domain: '組織・従業員',
    exact: ['divisions', 'employees', 'employee_approvers', 'program_targets'],
    prefixes: ['division_'],
  },
  {
    domain: 'ダッシュボード・お知らせ',
    exact: [
      'ui_dashboard_element',
      'tenant_ui_dashboard_element',
      'announcements',
      'dashboard_feed_read_state',
    ],
  },
  { domain: 'ログ・監査', exact: ['access_logs', 'ai_usage_logs'] },
  {
    domain: 'ストレスチェック・産業医',
    exact: ['tenant_stress_settings', 'doctor_availability_slots', 'interventions'],
    prefixes: ['stress_'],
  },
  { domain: '健康診断', exact: ['health_assessments_link'], prefixes: ['health_check_'] },
  {
    domain: '勤怠・残業・QR打刻',
    exact: [
      'monthly_employee_overtime',
      'monthly_overtime_closures',
      'timecard_corrections',
      'work_time_records',
      'supervisor_qr_permissions',
    ],
    prefixes: ['overtime_', 'closure_', 'qr_'],
  },
  { domain: 'テレワーク', prefixes: ['telework_'] },
  {
    domain: 'パルス・アンケート・コンディション',
    exact: ['condition_checkins', 'workplace_improvement_plans'],
    prefixes: ['pulse_', 'survey_', 'questionnaire', 'auto_distribution_', 'engagement_'],
  },
  {
    domain: '1on1・キャリア面談・相談',
    exact: ['consultations', 'consultation_replies'],
    prefixes: ['one_on_one_', 'career_discussion'],
  },
  {
    domain: '人事評価・OKR・360度',
    exact: ['objectives', 'key_results', 'checkins', 'grade_evaluation_criteria'],
    prefixes: ['evaluation_', 'global_evaluation_', 'review_360_'],
  },
  {
    domain: 'スキル・資格・研修計画',
    exact: [
      'qualifications',
      'employee_qualifications',
      'employee_career_goals',
      'employee_recommended_courses',
      'employee_training_plans',
      'tenant_skills',
      'tenant_skill_level_sets',
    ],
    prefixes: ['skill_', 'employee_skill_', 'global_skill_', 'training_plan_'],
  },
  { domain: 'eラーニング', prefixes: ['el_'] },
  {
    domain: '採用・リファラル',
    exact: ['candidates', 'candidate_pulses', 'recruitment_jobs'],
    prefixes: ['job_posting', 'referral_'],
  },
  {
    domain: '離職リスク・ライフサイクル',
    exact: ['exit_interviews'],
    prefixes: ['turnover_risk_', 'lifecycle_'],
  },
  {
    domain: '人員計画・後継者',
    exact: ['project_simulations'],
    prefixes: ['simulation_', 'succession_'],
  },
  { domain: '称賛・表彰・社内イベント', exact: ['awards'], prefixes: ['kudos', 'internal_event'] },
  { domain: 'タスク管理', exact: ['tasks'], prefixes: ['task_'] },
  {
    domain: 'AI・法令・RAG',
    exact: ['tenant_research_queries'],
    prefixes: ['hr_law_', 'tenant_rag_', 'tenant_hr_assistant_', 'tenant_inquiry_chat_'],
  },
  { domain: '助成金', exact: ['grants'], prefixes: ['grant_'] },
  { domain: 'LINE連携', prefixes: ['line_'] },
  { domain: '書類・画像取込', prefixes: ['captured_document', 'picture_send'] },
  { domain: 'mYou（別製品）', prefixes: ['myou_'] },
]

type TableRow = { name: string; comment: string | null; rowCount: number; funcRefs: number }
type CodeRef = { count: number; places: Set<string> }
type CatalogRow = TableRow & { domain: string; codeRefs: number; places: string[] }

/** テーブル名からドメインを判定する */
function resolveDomain(table: string, rules: DomainRule[] = DOMAIN_RULES): string {
  const exactHit = rules.find(r => r.exact?.includes(table))
  if (exactHit) return exactHit.domain
  const prefixHit = rules.find(r => r.prefixes?.some(p => table.startsWith(p)))
  return prefixHit?.domain ?? UNCLASSIFIED
}

/** ファイルパスを「どの機能から参照されているか」が分かる短い表記にする */
function toPlace(filePath: string): string {
  const parts = filePath.split(path.sep)
  const featureIdx = parts.indexOf('features')
  if (featureIdx >= 0 && parts[featureIdx + 1]) {
    const sub =
      parts[featureIdx + 1] === 'adm' && parts[featureIdx + 2]
        ? `adm/${parts[featureIdx + 2]}`
        : parts[featureIdx + 1]
    return `features/${sub}`
  }
  if (parts[0] === 'supabase') return `functions/${parts[2] ?? ''}`
  if (parts[0] === 'scripts') return 'scripts'
  return parts.slice(0, 3).join('/')
}

function listSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : listSourceFiles(full)
    return SCAN_EXTENSIONS.has(path.extname(entry.name)) ? [full] : []
  })
}

const FROM_PATTERN = /\.from\(\s*['"`]([a-z0-9_]+)['"`]/g
const SELECT_PATTERN = /\.select\(\s*(['"`])([\s\S]*?)\1/g
// select 文字列内のネスト参照: `table(...)` / `alias:table(...)` / `table!inner(...)`
// 簡易判定のため `count()` 等も拾うが、実在テーブル名と一致したものだけが集計に効く
const EMBED_PATTERN = /([a-z0-9_]+)(?:![a-z0-9_]+)?\s*\(/g

/** ファイル内で参照しているテーブル名を列挙する（.from() と select 内のネスト参照） */
function extractTableNames(text: string): string[] {
  const fromNames = [...text.matchAll(FROM_PATTERN)].map(m => m[1])
  const embedNames = [...text.matchAll(SELECT_PATTERN)].flatMap(m =>
    [...m[2].matchAll(EMBED_PATTERN)].map(e => e[1])
  )
  return [...fromNames, ...embedNames]
}

/** テーブルごとのコード参照数と参照元を集計する */
function collectCodeRefs(): Map<string, CodeRef> {
  const refs = new Map<string, CodeRef>()
  const files = SCAN_DIRS.flatMap(listSourceFiles).filter(
    f => !f.endsWith('generate_table_catalog.ts')
  )
  for (const file of files) {
    for (const name of extractTableNames(fs.readFileSync(file, 'utf8'))) {
      const current = refs.get(name) ?? { count: 0, places: new Set<string>() }
      refs.set(name, {
        count: current.count + 1,
        places: new Set([...current.places, toPlace(file)]),
      })
    }
  }
  return refs
}

async function fetchTables(): Promise<TableRow[]> {
  const sql = postgres(LOCAL_DB_URL, { max: 1 })
  try {
    const rows = await sql<{ name: string; comment: string | null; func_refs: string }[]>`
      SELECT
        c.relname AS name,
        obj_description(c.oid, 'pg_class') AS comment,
        (
          SELECT count(*) FROM pg_proc p
          WHERE p.pronamespace = 'public'::regnamespace
            AND p.prosrc ~ ('\\m' || c.relname || '\\M')
        ) AS func_refs
      FROM pg_class c
      WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p')
      ORDER BY c.relname
    `
    // ローカルは統計値（n_live_tup）が未収集のことが多いため、実件数を数える
    const tables: TableRow[] = []
    for (const r of rows) {
      const [{ n }] = await sql<
        { n: number }[]
      >`SELECT count(*)::int AS n FROM public.${sql(r.name)}`
      tables.push({ name: r.name, comment: r.comment, rowCount: n, funcRefs: Number(r.func_refs) })
    }
    return tables
  } finally {
    await sql.end()
  }
}

const escapeCell = (value: string) => value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

function renderTable(rows: CatalogRow[]): string[] {
  const header = [
    '| テーブル | 説明 | 行数 | コード参照 | DB関数参照 | 参照元 |',
    '|---|---|--:|--:|--:|---|',
  ]
  const body = rows.map(
    r =>
      `| \`${r.name}\` | ${escapeCell(r.comment ?? '（コメントなし）')} | ${r.rowCount} | ${r.codeRefs} | ${r.funcRefs} | ${escapeCell(r.places.join(', '))} |`
  )
  return [...header, ...body]
}

function renderCatalog(rows: CatalogRow[]): string {
  const generatedAt = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
  const domainOrder = [...DOMAIN_RULES.map(r => r.domain), UNCLASSIFIED]
  const byDomain = domainOrder
    .map(domain => ({ domain, rows: rows.filter(r => r.domain === domain) }))
    .filter(g => g.rows.length > 0)
  const unused = rows.filter(r => r.codeRefs === 0 && r.funcRefs === 0)
  const noComment = rows.filter(r => !r.comment)

  const lines = [
    '# DBテーブル台帳（public スキーマ）',
    '',
    `> 自動生成: \`npx tsx scripts/generate_table_catalog.ts\`（${generatedAt} 時点・ローカルDB）。手で編集しないこと。`,
    '> 行数はローカルDBの実件数で、本番の件数ではない。',
    '',
    '## サマリ',
    '',
    `- テーブル数: **${rows.length}**`,
    `- ドメイン数: **${byDomain.length}**`,
    `- コメントなし: **${noComment.length}**`,
    `- 未使用候補（コード参照0・DB関数参照0）: **${unused.length}**`,
    '',
    '| ドメイン | テーブル数 |',
    '|---|--:|',
    ...byDomain.map(g => `| [${g.domain}](#${g.domain}) | ${g.rows.length} |`),
    '',
  ]

  const domainSections = byDomain.flatMap(g => [`## ${g.domain}`, '', ...renderTable(g.rows), ''])

  const unusedSection = [
    '## 未使用候補',
    '',
    'アプリのコード（`.from()`）からも DB 関数からも参照されていないテーブル。**削除はしない**。棚卸しの判断材料として記録している。',
    'FK で参照されているもの・マスタデータが入っているものがあるため、削除する場合は別タスクで本番件数を確認してから判断する。',
    '',
    ...(unused.length > 0 ? renderTable(unused) : ['（なし）']),
    '',
  ]

  return [...lines, ...domainSections, ...unusedSection].join('\n')
}

async function main() {
  const [tables, codeRefs] = await Promise.all([fetchTables(), Promise.resolve(collectCodeRefs())])
  const rows: CatalogRow[] = tables.map(t => {
    const ref = codeRefs.get(t.name)
    return {
      ...t,
      domain: resolveDomain(t.name),
      codeRefs: ref?.count ?? 0,
      places: [...(ref?.places ?? [])].sort(),
    }
  })

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, renderCatalog(rows))

  const unclassified = rows.filter(r => r.domain === UNCLASSIFIED).map(r => r.name)
  console.log(`✅ ${OUTPUT_PATH} を生成しました（${rows.length} テーブル）`)
  if (unclassified.length > 0)
    console.warn(`⚠️ 未分類 ${unclassified.length} 件: ${unclassified.join(', ')}`)
}

main().catch(error => {
  console.error('台帳の生成に失敗しました:', error)
  process.exit(1)
})
