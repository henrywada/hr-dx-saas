import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { parseMigrationFiles } from './parse-bundle'
import { decodeCsvBytes, detectDelimiter } from './decode-csv'
import { japaneseFiscalYear, mapEmployeeSex, parseFlexibleDate, sexForStressScoring } from './dates'
import { parseEmployeeCsvBytes, parseEmployeeCsvText } from './parse-employee'
import { buildDivisionPlans } from './org-tree'
import { parseStressCsvText } from './parse-stress'
import { buildMigrationPreview } from './preview'
import { MIGRATION_TEMP_PASSWORD } from './types'

test('decodeCsvBytes reads UTF-16 LE TSV with BOM', () => {
  const header =
    'employee_no\tname\tname-kana\tmailadress\tsex\tbirth\t組織１\t組織２\t組織３\t組織４\t組織５\n'
  const row = 's1\t太郎\tタロウ\ts1@hr-dx.com\t男\t19900101\t本社\t人事部\t\t\t\n'
  const payload = header + row
  const bom = Buffer.from([0xff, 0xfe])
  const body = Buffer.from(payload, 'utf16le')
  const bytes = Uint8Array.from(Buffer.concat([bom, body])).buffer
  const { text, encoding } = decodeCsvBytes(bytes)
  assert.equal(encoding, 'utf-16le')
  assert.equal(detectDelimiter(text), '\t')
  const parsed = parseEmployeeCsvText(text)
  assert.equal(parsed.error, null)
  assert.equal(parsed.rows.length, 1)
  assert.equal(parsed.rows[0].employeeNo, 's1')
  assert.equal(parsed.rows[0].name, '太郎')
  assert.equal(parsed.rows[0].email, 's1@hr-dx.com')
  assert.equal(parsed.rows[0].sex, '男性')
  assert.deepEqual(parsed.rows[0].orgPath, ['本社', '人事部'])
})

test('parseEmployeeCsvBytes accepts UTF-16 LE employee.csv', () => {
  const header =
    'employee_no\tname\tname-kana\tmailadress\tsex\tbirth\t組織１\t組織２\t組織３\t組織４\t組織５\n'
  const row = 's2\t花子\tハナコ\ts2@hr-dx.com\t女\t19880315\t東京支店\t営業部\t第一課\t\t\n'
  const bom = Buffer.from([0xff, 0xfe])
  const body = Buffer.from(header + row, 'utf16le')
  const bytes = Uint8Array.from(Buffer.concat([bom, body])).buffer
  const parsed = parseEmployeeCsvBytes(bytes)
  assert.equal(parsed.rows[0].sex, '女性')
  assert.equal(parsed.rows[0].email, 's2@hr-dx.com')
  assert.deepEqual(parsed.rows[0].orgPath, ['東京支店', '営業部', '第一課'])
})

test('duplicate employee_no is an error', () => {
  const text = [
    'employee_no,name,name-kana,mailadress,sex,birth,組織１,組織２,組織３,組織４,組織５',
    's1,a,a,a@hr-dx.com,男,19900101,本社,,,,',
    's1,b,b,b@hr-dx.com,男,19900102,本社,,,,',
  ].join('\n')
  const parsed = parseEmployeeCsvText(text)
  assert.equal(parsed.rows[1].error?.includes('重複'), true)
})

test('mailadress is required and duplicate email is an error', () => {
  const missing = parseEmployeeCsvText(
    ['employee_no,name,sex,組織１', 's1,太郎,男,本社'].join('\n')
  )
  assert.equal(missing.error?.includes('mailadress'), true)

  const dup = parseEmployeeCsvText(
    [
      'employee_no,name,mailadress,sex,組織１',
      's1,太郎,same@hr-dx.com,男,本社',
      's2,花子,same@hr-dx.com,女,本社',
    ].join('\n')
  )
  assert.equal(dup.rows[1].error?.includes('mailadress'), true)
})

test('buildDivisionPlans parents come first and unique paths collapse', () => {
  const parsed = parseEmployeeCsvText(
    [
      'employee_no,name,mailadress,sex,組織１,組織２,組織３,組織４,組織５',
      'a,A,a@hr-dx.com,男,本社,管理本部,人事部,,',
      'b,B,b@hr-dx.com,女,本社,管理本部,人事部,採用グループ,',
      'c,C,c@hr-dx.com,男,本社,,,,',
    ].join('\n')
  )
  const plans = buildDivisionPlans(parsed.rows)
  assert.equal(plans[0].name, '本社')
  assert.equal(plans[0].layer, 1)
  assert.equal(plans[0].parentKey, null)
  assert.ok(plans.some(p => p.name === '採用グループ' && p.layer === 4))
  assert.equal(plans.filter(p => p.name === '本社').length, 1)
})

test('parseFlexibleDate and fiscal year', () => {
  assert.equal(parseFlexibleDate('2026/8/1'), '2026-08-01')
  assert.equal(parseFlexibleDate('20180618'), '2018-06-18')
  assert.equal(japaneseFiscalYear('2018-06-18'), 2018)
  assert.equal(japaneseFiscalYear('2019-02-25'), 2018)
})

test('sex mapping for employee form and stress scoring', () => {
  assert.equal(mapEmployeeSex('男'), '男性')
  assert.equal(mapEmployeeSex('女'), '女性')
  assert.equal(sexForStressScoring('女性'), 'female')
  assert.equal(sexForStressScoring('男'), 'male')
  assert.equal(sexForStressScoring('female'), 'female')
})

test('parseStressCsvText reads A1-A57', () => {
  const answers = Array.from({ length: 57 }, (_, i) => ((i % 4) + 1).toString())
  const header = ['employee_no', 'YMD', ...Array.from({ length: 57 }, (_, i) => `A${i + 1}`)].join(
    ','
  )
  const row = ['s1', '2026/8/1', ...answers].join(',')
  const parsed = parseStressCsvText(`${header}\n${row}`)
  assert.equal(parsed.error, null)
  assert.equal(parsed.rows[0].examDateYmd, '2026-08-01')
  assert.equal(parsed.rows[0].answers.length, 57)
  assert.equal(parsed.rows[0].answers[0], 1)
})

test('preview matches health/stress to csv employees and flags unknown nos', () => {
  const employees = parseEmployeeCsvText(
    ['employee_no,name,mailadress,sex,組織１', 's1,太郎,s1@hr-dx.com,男,本社'].join('\n')
  ).rows
  const preview = buildMigrationPreview({
    employeeRows: employees,
    healthPeople: [
      {
        employeeNo: 's1',
        name: '太郎',
        examDateYmd: '2018-06-18',
        primarySecondary: '1',
        overallJudgmentRaw: 'A1',
        files: {},
        warnings: [],
      },
      {
        employeeNo: 'missing',
        name: '不明',
        examDateYmd: '2018-06-18',
        primarySecondary: null,
        overallJudgmentRaw: null,
        files: {},
        warnings: [],
      },
    ],
    stressRows: parseStressCsvText(
      [
        ['employee_no', 'YMD', ...Array.from({ length: 57 }, (_, i) => `A${i + 1}`)].join(','),
        ['s1', '2026/8/1', ...Array(57).fill('2')].join(','),
      ].join('\n')
    ).rows,
    existingEmployees: [],
    maxEmployees: 10,
    existingCount: 0,
  })
  assert.equal(preview.employees.createCount, 1)
  assert.equal(preview.healthRows[0].matched, true)
  assert.equal(preview.healthRows[1].matched, false)
  assert.ok(preview.errorCount >= 1)
  assert.deepEqual(preview.health.fiscalYears, [2018])
})

test('sample CSVs parse to expected counts', () => {
  const dir = '/mnt/d/人事DX Hub/hr-dx-SaaS/移行データ'
  if (!existsSync(join(dir, 'employee.csv'))) return

  const toBuf = (name: string) => {
    const buf = readFileSync(join(dir, name))
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  }
  const parsed = parseMigrationFiles({
    employee: toBuf('employee.csv'),
    kenshin1: toBuf('kenshin1.csv'),
    kenshin2: toBuf('kenshin2.csv'),
    monshin: toBuf('monshin.csv'),
    stress: toBuf('stress-check.csv'),
  })
  assert.equal(parsed.employeeParseError, null)
  assert.equal(parsed.healthParseError, null)
  assert.equal(parsed.stressParseError, null)
  assert.equal(parsed.employeeRows.length, 439)
  assert.equal(parsed.healthPeople.length, 439)
  assert.equal(parsed.stressRows.length, 171)
  const plans = buildDivisionPlans(parsed.employeeRows)
  assert.equal(plans.length, 200)
  const preview = buildMigrationPreview({
    employeeRows: parsed.employeeRows,
    healthPeople: parsed.healthPeople,
    stressRows: parsed.stressRows,
    existingEmployees: [],
    maxEmployees: 1000,
    existingCount: 0,
  })
  assert.equal(preview.employees.createCount, 439)
  assert.equal(preview.errorCount, 0)
  assert.deepEqual(preview.health.fiscalYears, [2018])
  assert.deepEqual(preview.stress.dates, ['2026-08-01'])
})

test('preview errors when max_employees would be exceeded', () => {
  const employees = parseEmployeeCsvText(
    [
      'employee_no,name,mailadress,sex,組織１',
      's1,太郎,s1@hr-dx.com,男,本社',
      's2,花子,s2@hr-dx.com,女,本社',
    ].join('\n')
  ).rows
  const preview = buildMigrationPreview({
    employeeRows: employees,
    healthPeople: [],
    stressRows: [],
    existingEmployees: [],
    maxEmployees: 1,
    existingCount: 0,
  })
  assert.ok(preview.maxEmployeesError)
  assert.ok(preview.errorCount >= 1)
})

test('sample CSV mailadress is used as login email', () => {
  const dir = '/mnt/d/人事DX Hub/hr-dx-SaaS/移行データ'
  if (!existsSync(join(dir, 'employee.csv'))) return
  const buf = readFileSync(join(dir, 'employee.csv'))
  const bytes = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const parsed = parseEmployeeCsvBytes(bytes)
  assert.equal(parsed.error, null)
  assert.ok(parsed.rows.every(r => !r.error && r.email.endsWith('@hr-dx.com')))
  assert.equal(parsed.rows[0].email, 'sample1@hr-dx.com')
  assert.equal(MIGRATION_TEMP_PASSWORD, 'aaaaaa')
})
