// src/features/organization/types.ts

export type Division = {
  id: string;
  tenant_id: string;
  name: string | null;
  parent_id: string | null;
  layer: number | null;
  code: string | null;
};

export type DivisionTreeNode = Division & {
  children: DivisionTreeNode[];
  employeeCount: number;       // 直接所属の従業員数
  totalEmployeeCount: number;  // 子孫含む合計従業員数
  employees: EmployeeSummary[];
};

/** ツリー内の従業員表示用（軽量版） */
export type EmployeeSummary = {
  id: string;
  name: string | null;
  employee_no: string | null;
  job_title: string | null;
  division_id: string | null;
};

export type Employee = {
  id: string;
  tenant_id: string;
  division_id: string | null;
  active_status: string | null;
  name: string | null;
  is_manager: boolean | null;
  app_role_id: string | null;
  employee_no: string | null;
  job_title: string | null;
  sex: string | null;
  start_date: string | null;
  is_contacted_person: boolean | null;
  contacted_date: string | null;
  user_id: string | null;
  email?: string | null;
  // JOINで取得する関連情報
  division?: { id: string; name: string | null } | null;
  app_role?: { id: string; app_role: string | null; name: string | null } | null;
};

export type AppRole = {
  id: string;
  app_role: string | null;
  name: string | null;
};

/** active_status の日本語ラベルマッピング */
export const ACTIVE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active:      { label: 'アクティブ', color: 'bg-green-100 text-green-700' },
  off:         { label: '休職',       color: 'bg-red-100 text-red-700' },
  secondment:  { label: '出向',       color: 'bg-yellow-100 text-yellow-700' },
  doctor:      { label: '産業医',     color: 'bg-blue-100 text-blue-700' },
  system:      { label: 'システム',   color: 'bg-slate-100 text-slate-700' },
};

/**
 * 部署のフルパス名を生成するヘルパー
 * 例: 「東京事業所 / 営業部」
 */
export function buildDivisionFullPath(
  divisionId: string,
  divisions: Division[]
): string {
  const map = new Map(divisions.map(d => [d.id, d]));
  const parts: string[] = [];
  let current: Division | undefined = map.get(divisionId);

  while (current) {
    parts.unshift(current.name || '名前未設定');
    current = current.parent_id ? map.get(current.parent_id) : undefined;
  }

  return parts.join(' / ');
}

/**
 * 全部署のフルパス名マップを生成
 * { divisionId: "東京事業所 / 営業部" }
 */
export function buildDivisionPathMap(divisions: Division[]): Map<string, string> {
  const pathMap = new Map<string, string>();
  divisions.forEach(d => {
    pathMap.set(d.id, buildDivisionFullPath(d.id, divisions));
  });
  return pathMap;
}
