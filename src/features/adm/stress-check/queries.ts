import { createClient } from '@/lib/supabase/server';
import type {
  ProgressStats,
  ActivePeriodInfo,
  GroupAnalysisDepartment,
  GroupAnalysisSummary,
  ScaleAverages,
} from './types';
import { GROUP_ANALYSIS_SCALES } from './types';

/**
 * 現在アクティブなストレスチェック実施期間を取得
 * status='active' かつ期間内のものを返す
 */
export async function getActiveStressCheckPeriod(
  tenantId: string
): Promise<ActivePeriodInfo | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('stress_check_periods')
    .select('id, title, start_date, end_date, fiscal_year, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    // アクティブ期間が無い場合、最新の期間を代替取得
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: latest } = await (supabase as any)
      .from('stress_check_periods')
      .select('id, title, start_date, end_date, fiscal_year, status')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest) return null;
    return {
      id: latest.id,
      title: latest.title,
      startDate: latest.start_date,
      endDate: latest.end_date,
      fiscalYear: latest.fiscal_year,
      status: latest.status,
    };
  }

  return {
    id: data.id,
    title: data.title,
    startDate: data.start_date,
    endDate: data.end_date,
    fiscalYear: data.fiscal_year,
    status: data.status,
  };
}

/**
 * ストレスチェック進捗統計を集計
 * - 全従業員数
 * - 受検完了者数 / 未受検者数
 * - 同意率
 * - 部署別の進捗
 */
export async function getProgressStats(
  tenantId: string,
  periodId: string
): Promise<ProgressStats> {
  const supabase = await createClient();

  // 1. テナント内のアクティブな全従業員を部署情報付きで取得
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions:division_id(id, name)')
    .eq('tenant_id', tenantId)
    .eq('active_status', '在籍');

  const allEmployees = employees || [];
  const totalEmployees = allEmployees.length;

  // 2. 該当期間の提出データを取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: submissions } = await (supabase as any)
    .from('stress_check_submissions')
    .select('id, employee_id, status, consent_to_employer')
    .eq('tenant_id', tenantId)
    .eq('period_id', periodId);

  const allSubmissions = submissions || [];

  // 提出済み従業員IDのセット（status='completed' or submitted_at が存在）
  const submittedEmployeeIds = new Set<string>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allSubmissions.map((s: any) => s.employee_id)
  );

  // 同意者数
  const consentCount = allSubmissions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: any) => s.consent_to_employer === true
  ).length;

  const submittedCount = submittedEmployeeIds.size;
  const notSubmittedCount = totalEmployees - submittedCount;
  const submissionRate = totalEmployees > 0
    ? Math.round((submittedCount / totalEmployees) * 100)
    : 0;
  const consentRate = submittedCount > 0
    ? Math.round((consentCount / submittedCount) * 100)
    : 0;

  // 3. 部署別集計
  const deptMap = new Map<string, { name: string; total: number; submitted: number }>();

  for (const emp of allEmployees) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const division = emp.divisions as any;
    const deptName = division?.name || '未配属';
    const deptId = division?.id || 'unassigned';

    if (!deptMap.has(deptId)) {
      deptMap.set(deptId, { name: deptName, total: 0, submitted: 0 });
    }
    const dept = deptMap.get(deptId)!;
    dept.total += 1;

    if (submittedEmployeeIds.has(emp.id)) {
      dept.submitted += 1;
    }
  }

  const departments = Array.from(deptMap.values())
    .map((d) => ({
      name: d.name,
      submitted: d.submitted,
      notSubmitted: d.total - d.submitted,
      rate: d.total > 0 ? Math.round((d.submitted / d.total) * 100) : 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

  return {
    totalEmployees,
    submittedCount,
    notSubmittedCount,
    consentCount,
    submissionRate,
    consentRate,
    departments,
  };
}

// ============================================================
// 集団分析（組織健康度分析）クエリ
// ============================================================

/** scale_scores JSON 内の個別スコア */
interface StoredScaleScore {
  scaleName: string;
  evalPoint: number;
  rawScore: number;
  category: string;
}

/**
 * 厚労省基準の全国平均評価点（男性・57項目版 参考値）
 * 健康リスク算出に使用
 */
const NATIONAL_AVG: Record<string, number> = {
  '心理的な仕事の負担（量）': 3.0,
  '仕事のコントロール度': 3.0,
  '上司からのサポート': 2.8,
  '同僚からのサポート': 3.0,
};

/**
 * 集団分析（組織健康度分析）のデータを取得・集計
 *
 * 処理概要:
 * 1. テナント内の全従業員を部署付きで取得
 * 2. 該当期間の stress_check_results を取得（scale_scores, score_a〜d, is_high_stress）
 * 3. 部署別にグループ化し、回答者10名未満はマスキング
 * 4. 主要尺度の平均評価点、カテゴリ平均素点、高ストレス率を算出
 */
export async function getGroupAnalysisData(
  tenantId: string,
  periodId: string
): Promise<{ departments: GroupAnalysisDepartment[]; summary: GroupAnalysisSummary }> {
  const supabase = await createClient();

  // 1. テナント内のアクティブな従業員を部署付きで取得
  const { data: employees } = await supabase
    .from('employees')
    .select('id, name, division_id, divisions:division_id(id, name)')
    .eq('tenant_id', tenantId)
    .eq('active_status', '在籍');

  const allEmployees = employees || [];

  // 従業員ID → 部署情報のマップ
   
  const employeeDeptMap = new Map<string, { deptId: string; deptName: string }>();
  for (const emp of allEmployees) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const division = emp.divisions as any;
    employeeDeptMap.set(emp.id, {
      deptId: division?.id || 'unassigned',
      deptName: division?.name || '未配属',
    });
  }

  // 2. 該当期間の結果データ（score_a〜d, scale_scores, is_high_stress）を取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: results } = await (supabase as any)
    .from('stress_check_results')
    .select('employee_id, score_a, score_b, score_c, score_d, scale_scores, is_high_stress')
    .eq('tenant_id', tenantId)
    .eq('period_id', periodId);

  const allResults = results || [];

  // 3. 部署別に集計用マップを構築
  interface DeptAgg {
    deptName: string;
    respondentCount: number;
    highStressCount: number;
    scoreA: number[];
    scoreB: number[];
    scoreC: number[];
    scoreD: number[];
    scaleScores: Map<string, number[]>; // scaleName -> evalPoint[]
  }

  const deptAggMap = new Map<string, DeptAgg>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const result of allResults as any[]) {
    const empDept = employeeDeptMap.get(result.employee_id);
    if (!empDept) continue; // テナント外、または退職済み

    const deptId = empDept.deptId;

    if (!deptAggMap.has(deptId)) {
      deptAggMap.set(deptId, {
        deptName: empDept.deptName,
        respondentCount: 0,
        highStressCount: 0,
        scoreA: [],
        scoreB: [],
        scoreC: [],
        scoreD: [],
        scaleScores: new Map(),
      });
    }
    const agg = deptAggMap.get(deptId)!;
    agg.respondentCount += 1;

    if (result.is_high_stress) {
      agg.highStressCount += 1;
    }

    // カテゴリ別素点
    if (result.score_a != null) agg.scoreA.push(result.score_a);
    if (result.score_b != null) agg.scoreB.push(result.score_b);
    if (result.score_c != null) agg.scoreC.push(result.score_c);
    if (result.score_d != null) agg.scoreD.push(result.score_d);

    // scale_scores JSON を解析
    const scaleData = result.scale_scores as StoredScaleScore[] | null;
    if (Array.isArray(scaleData)) {
      for (const ss of scaleData) {
        if (!agg.scaleScores.has(ss.scaleName)) {
          agg.scaleScores.set(ss.scaleName, []);
        }
        agg.scaleScores.get(ss.scaleName)!.push(ss.evalPoint);
      }
    }
  }

  // 3.5 10名未満の部署を「その他」にまとめる
  const MASKING_THRESHOLD = 10;
  const mergedDeptAggMap = new Map<string, DeptAgg>();
  
  const otherAgg: DeptAgg = {
    deptName: 'その他（10名未満の部署合算）',
    respondentCount: 0,
    highStressCount: 0,
    scoreA: [],
    scoreB: [],
    scoreC: [],
    scoreD: [],
    scaleScores: new Map(),
  };

  let maskedDeptCount = 0;

  for (const [deptId, agg] of deptAggMap) {
    if (agg.respondentCount < MASKING_THRESHOLD) {
      maskedDeptCount += 1;
      otherAgg.respondentCount += agg.respondentCount;
      otherAgg.highStressCount += agg.highStressCount;
      otherAgg.scoreA.push(...agg.scoreA);
      otherAgg.scoreB.push(...agg.scoreB);
      otherAgg.scoreC.push(...agg.scoreC);
      otherAgg.scoreD.push(...agg.scoreD);
      
      for (const [scaleName, evalPoints] of agg.scaleScores) {
        if (!otherAgg.scaleScores.has(scaleName)) {
          otherAgg.scaleScores.set(scaleName, []);
        }
        otherAgg.scaleScores.get(scaleName)!.push(...evalPoints);
      }
    } else {
      mergedDeptAggMap.set(deptId, agg);
    }
  }

  if (otherAgg.respondentCount > 0) {
    mergedDeptAggMap.set('other_masked', otherAgg);
  }

  // 4. 部署別データを構築
  const departments: GroupAnalysisDepartment[] = [];

  // 全社集計用の累積
  let totalRespondents = 0;
  let totalHighStress = 0;
  const allScaleAcc: Map<string, number[]> = new Map();

  for (const [, agg] of mergedDeptAggMap) {
    // 合算後も10名未満ならマスキング（念のため）
    const isMasked = agg.respondentCount < MASKING_THRESHOLD;

    // 尺度平均（マスキング時は null）
    const scaleAverages: ScaleAverages = {
      workloadQuantity: null,
      workloadQuality: null,
      control: null,
      supervisorSupport: null,
      coworkerSupport: null,
      vitality: null,
    };

    if (!isMasked) {
      for (const scaleDef of GROUP_ANALYSIS_SCALES) {
        const vals = agg.scaleScores.get(scaleDef.dbName);
        if (vals && vals.length > 0) {
          const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
          (scaleAverages as unknown as Record<string, number | null>)[scaleDef.key] = Math.round(avg * 10) / 10;
        }

        // 全社用にも累積（その他のデータも実データとして集計に含めるが、全社平均は元の全データを足し合わせたものと一致するはず）
        if (vals) {
          if (!allScaleAcc.has(scaleDef.key)) allScaleAcc.set(scaleDef.key, []);
          allScaleAcc.get(scaleDef.key)!.push(...vals);
        }
      }
    }

    // 総合健康リスク算出（マスキング時は null）
    let totalHealthRisk: number | null = null;
    if (!isMasked) {
      const wlVals = agg.scaleScores.get('心理的な仕事の負担（量）');
      const ctrlVals = agg.scaleScores.get('仕事のコントロール度');
      const supVals = agg.scaleScores.get('上司からのサポート');
      const cowVals = agg.scaleScores.get('同僚からのサポート');

      if (wlVals?.length && ctrlVals?.length && supVals?.length && cowVals?.length) {
        const avgWl = wlVals.reduce((s, v) => s + v, 0) / wlVals.length;
        const avgCtrl = ctrlVals.reduce((s, v) => s + v, 0) / ctrlVals.length;
        const avgSup = supVals.reduce((s, v) => s + v, 0) / supVals.length;
        const avgCow = cowVals.reduce((s, v) => s + v, 0) / cowVals.length;

        const natWl = NATIONAL_AVG['心理的な仕事の負担（量）'];
        const natCtrl = NATIONAL_AVG['仕事のコントロール度'];
        const natSup = NATIONAL_AVG['上司からのサポート'];
        const natCow = NATIONAL_AVG['同僚からのサポート'];

        // 健康リスクA = (仕事の負担/全国平均) × (コントロール度/全国平均) × 100
        const riskA = (avgWl / natWl) * (avgCtrl / natCtrl) * 100;
        // 健康リスクB = (上司サポート/全国平均) × (同僚サポート/全国平均) × 100
        const riskB = (avgSup / natSup) * (avgCow / natCow) * 100;
        // 総合 = A × B / 100
        totalHealthRisk = Math.round((riskA * riskB) / 100);
      }
    }

    // 全社累積
    totalRespondents += agg.respondentCount;
    totalHighStress += agg.highStressCount;

    const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null;

    departments.push({
      departmentName: agg.deptName,
      respondentCount: agg.respondentCount,
      isMasked,
      scaleAverages,
      avgScoreA: isMasked ? null : avg(agg.scoreA),
      avgScoreB: isMasked ? null : avg(agg.scoreB),
      avgScoreC: isMasked ? null : avg(agg.scoreC),
      avgScoreD: isMasked ? null : avg(agg.scoreD),
      highStressCount: isMasked ? 0 : agg.highStressCount,
      highStressRate: isMasked ? 0 : (agg.respondentCount > 0 ? Math.round((agg.highStressCount / agg.respondentCount) * 100) : 0),
      totalHealthRisk,
    });
  }

  // 回答者数の降順でソート
  departments.sort((a, b) => b.respondentCount - a.respondentCount);

  // 5. 全社サマリーを算出
  const overallHighStressRate = totalRespondents > 0
    ? Math.round((totalHighStress / totalRespondents) * 100)
    : 0;

  // 全社平均尺度スコア
  const overallScaleAverages: ScaleAverages = {
    workloadQuantity: null,
    workloadQuality: null,
    control: null,
    supervisorSupport: null,
    coworkerSupport: null,
    vitality: null,
  };

  for (const scaleDef of GROUP_ANALYSIS_SCALES) {
    const vals = allScaleAcc.get(scaleDef.key);
    if (vals && vals.length > 0) {
      (overallScaleAverages as unknown as Record<string, number | null>)[scaleDef.key] =
        Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
    }
  }

  // 全社健康リスク
  let overallHealthRisk: number | null = null;
  const allWl = allScaleAcc.get('workloadQuantity');
  const allCtrl = allScaleAcc.get('control');
  const allSup = allScaleAcc.get('supervisorSupport');
  const allCow = allScaleAcc.get('coworkerSupport');
  if (allWl?.length && allCtrl?.length && allSup?.length && allCow?.length) {
    const avgWl = allWl.reduce((s, v) => s + v, 0) / allWl.length;
    const avgCtrl = allCtrl.reduce((s, v) => s + v, 0) / allCtrl.length;
    const avgSup = allSup.reduce((s, v) => s + v, 0) / allSup.length;
    const avgCow = allCow.reduce((s, v) => s + v, 0) / allCow.length;

    const natWl = NATIONAL_AVG['心理的な仕事の負担（量）'];
    const natCtrl = NATIONAL_AVG['仕事のコントロール度'];
    const natSup = NATIONAL_AVG['上司からのサポート'];
    const natCow = NATIONAL_AVG['同僚からのサポート'];

    const rA = (avgWl / natWl) * (avgCtrl / natCtrl) * 100;
    const rB = (avgSup / natSup) * (avgCow / natCow) * 100;
    overallHealthRisk = Math.round((rA * rB) / 100);
  }

  const summary: GroupAnalysisSummary = {
    totalRespondents,
    overallHighStressRate,
    overallHealthRisk,
    maskedDepartmentCount: maskedDeptCount,
    overallScaleAverages,
  };

  return { departments, summary };
}
