#!/usr/bin/env node
/**
 * バックアップから Users（auth スキーマ）を除いたデータのみを復元する
 *
 * 使用方法:
 *   node scripts/restore_data_exclude_users.js [バックアップフォルダ]
 *   例: node scripts/restore_data_exclude_users.js backups/backup_20260316_123956
 *
 * 出力: フィルタ済みの data_no_auth.sql を生成し、psql で投入
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backupDir = process.argv[2] || 'backups/backup_20260316_123956';
const dataFile = path.join(backupDir, 'data.sql');
const outFile = path.join(backupDir, 'data_no_auth.sql');

if (!fs.existsSync(dataFile)) {
  console.error('エラー: data.sql が見つかりません:', dataFile);
  process.exit(1);
}

const content = fs.readFileSync(dataFile, 'utf8');
const lines = content.split('\n');

// user_id / created_by を NULL に置換するテーブル（auth.users 参照のため）
const NULLIFY_USER_ID_TABLES = new Set(['employees', 'access_logs']);
const NULLIFY_CREATED_BY_TABLES = new Set(['recruitment_jobs']);

// user_id が NOT NULL のため復元をスキップするテーブル
const SKIP_TABLES = new Set(['survey_responses', 'pulse_survey_responses']);

let currentTable = null;
let currentSchema = null;
let inBlock = false;
let output = [];
let skipBlock = false;

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

// employees: 行末の最後の 'uuid' を NULL に（user_id は最終列）
function nullifyLastUuid(line) {
  const re = new RegExp(`, '(${UUID})'\\)(\\s*[,;]\\s*)?$`);
  const m = line.match(re);
  if (!m) return line;
  return line.replace(re, ', NULL)' + (m[2] || ''));
}

// access_logs: 3列目の user_id を NULL に（id, tenant_id, user_id, action, ...）
function nullifyAccessLogsUserId(line) {
  return line.replace(/\t\('([^']+)', '([^']+)', '([^']+)'/, (_, id, tenant, userId) => {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
      return `\t('${id}', '${tenant}', NULL`;
    }
    return `\t('${id}', '${tenant}', '${userId}'`;
  });
}

// recruitment_jobs: created_by 列の uuid を NULL に（..., NULL, NULL, 'uuid', '2026-...', '2026-...' のパターン）
function nullifyRecruitmentCreatedBy(line) {
  const re = /, NULL, NULL, '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', '(\d{4}-\d{2}-\d{2}[^']*)', '(\d{4}-\d{2}-\d{2}[^']*)'/;
  return line.replace(re, ', NULL, NULL, NULL, \'$2\', \'$3\'');
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const headerMatch = line.match(/^-- Data for Name: (\w+); Type: TABLE DATA; Schema: (\w+);/);

  if (headerMatch) {
    const [, tableName, schema] = headerMatch;
    currentTable = tableName;
    currentSchema = schema;

    if (schema === 'auth') {
      skipBlock = true;
      inBlock = true;
      continue;
    }
    if (SKIP_TABLES.has(tableName)) {
      skipBlock = true;
      inBlock = true;
      continue;
    }

    skipBlock = false;
    inBlock = true;
    output.push(line);
    continue;
  }

  if (skipBlock) {
    if (line.startsWith('--') && line.includes('Data for Name:')) {
      // 次のブロックへ
    } else if (line.startsWith('--') && !line.includes('Data for Name:')) {
      // ブロック内のコメントはスキップ
    } else if (line.trim() === '' && lines[i + 1] && lines[i + 1].startsWith('--')) {
      // 空行の後が次のブロック
    }
    continue;
  }

  if (inBlock && currentTable) {
    if (line.startsWith('--') && line.includes('Data for Name:')) {
      inBlock = false;
      currentTable = null;
      i--;
      continue;
    }

    let outLine = line;

    if (currentTable === 'employees' && !line.includes('VALUES') && line.match(/'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'\)\s*[,;]?\s*$/)) {
      outLine = nullifyLastUuid(line);
    }
    if (currentTable === 'access_logs' && line.startsWith("\t(") && line.includes("'")) {
      outLine = nullifyAccessLogsUserId(line);
    }
    if (NULLIFY_CREATED_BY_TABLES.has(currentTable) && /, NULL, NULL, '[0-9a-f-]{36}', '\d{4}-\d{2}-\d{2}/.test(line)) {
      outLine = nullifyRecruitmentCreatedBy(line);
    }

    output.push(outLine);
  } else if (!inBlock || !currentTable) {
    if (line.startsWith('--') && line.includes('Data for Name:')) {
      inBlock = true;
      i--;
    } else {
      output.push(line);
    }
  }
}

fs.writeFileSync(outFile, output.join('\n'), 'utf8');
console.log('フィルタ済み SQL を生成しました:', outFile);
