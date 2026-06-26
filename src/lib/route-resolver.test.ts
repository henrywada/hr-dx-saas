import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { resolvePageFilePath } from './route-resolver'

function makeTempAppDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-resolver-test-'))
  // /adm/job-positions → (tenant)/(tenant-admin)/adm/job-positions/page.tsx
  fs.mkdirSync(path.join(dir, '(tenant)', '(tenant-admin)', 'adm', 'job-positions'), {
    recursive: true,
  })
  fs.writeFileSync(
    path.join(dir, '(tenant)', '(tenant-admin)', 'adm', 'job-positions', 'page.tsx'),
    '// job-positions page'
  )
  // ルート直下の page.tsx（"/" に対応）
  fs.writeFileSync(path.join(dir, 'page.tsx'), '// root page')
  // ネストしたルートグループ
  fs.mkdirSync(path.join(dir, '(saas-admin)', 'saas_adm', '(base_mnt)', 'system-master'), {
    recursive: true,
  })
  fs.writeFileSync(
    path.join(dir, '(saas-admin)', 'saas_adm', '(base_mnt)', 'system-master', 'page.tsx'),
    '// system-master page'
  )
  return dir
}

test('ルートグループを含むパスを解決できる', () => {
  const appDir = makeTempAppDir()
  const result = resolvePageFilePath('/adm/job-positions', appDir)
  assert.equal(
    result,
    path.join(appDir, '(tenant)', '(tenant-admin)', 'adm', 'job-positions', 'page.tsx')
  )
})

test('ネストしたルートグループを含むパスを解決できる', () => {
  const appDir = makeTempAppDir()
  const result = resolvePageFilePath('/saas_adm/system-master', appDir)
  assert.equal(
    result,
    path.join(appDir, '(saas-admin)', 'saas_adm', '(base_mnt)', 'system-master', 'page.tsx')
  )
})

test('ルート直下の page.tsx を "/" として解決できる', () => {
  const appDir = makeTempAppDir()
  const result = resolvePageFilePath('/', appDir)
  assert.equal(result, path.join(appDir, 'page.tsx'))
})

test('一致するファイルがない場合は null を返す', () => {
  const appDir = makeTempAppDir()
  const result = resolvePageFilePath('/no-such-route', appDir)
  assert.equal(result, null)
})

test('空文字の場合は走査せず null を返す', () => {
  const appDir = makeTempAppDir()
  const result = resolvePageFilePath('', appDir)
  assert.equal(result, null)
})
