/**
 * 匿名ID（A-XXX）生成ユーティリティ
 * stress_result_id から決定論的に生成し、テナント・期間内で一意を保つ
 */
export function generateAnonymousId(
  stressResultId: string,
  indexInPeriod: number
): string {
  // A-001, A-002, ... 形式（3桁ゼロパッド）
  const num = (indexInPeriod % 999) + 1;
  return `A-${num.toString().padStart(3, '0')}`;
}

/**
 * 部署名を匿名表示用に変換（例: 営業 → 部署A）
 * 同一テナント内で部署ごとに一意の匿名ラベルを付与
 */
export function getAnonymousDivisionLabel(
  divisionIndex: number
): string {
  const labels = ['部署A', '部署B', '部署C', '部署D', '部署E', '部署F', '部署G', '部署H', '部署I', '部署J'];
  return labels[divisionIndex % labels.length] ?? `部署${divisionIndex + 1}`;
}
