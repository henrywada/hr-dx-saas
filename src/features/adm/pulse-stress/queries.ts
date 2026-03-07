import { createClient } from '@/lib/supabase/server';
import { getActivePeriod } from '@/features/stress-check/queries';

export interface PulseStressEmployeeData {
  employeeId: string;
  userId: string;
  name: string;
  divisionName: string;
  stressCheckScores: any;
  bossSupportEvalList: number; 
  healthRisk: number; 
  isHighStress: boolean;
  pulseScores: Record<string, number>; // period -> avg score
  pulseTrendDown: boolean; 
  warningLevel: 'high' | 'medium' | 'low';
}

export interface PulseStressDepartmentData {
  divisionName: string;
  healthRisk: number; // 総合健康リスク
  avgPulseScore: number; // 最新または数ヶ月平均のパルススコア
}

export interface PulseStressChartData {
  period: string;
  pulseAvg: number;
  stressRiskArea: number; // 面で表示する総合健康リスク（基本はフラットか段階）
}

export async function getCrossAnalysisData(tenantId: string) {
  const supabase = await createClient();

  // 1. ストレスチェック（最新期間）のデータ取得
  const period = await getActivePeriod();
  let scResults: any[] = [];
  let divResults: any[] = [];

  if (period) {
    const { data: results } = await supabase
      .from('stress_check_results')
      .select(`
        id, is_high_stress, score_a, score_b, score_c, score_d, scale_scores,
        employee_id,
        employees ( id, user_id, name, divisions ( name ) )
      `)
      .eq('period_id', period.id);
    scResults = results || [];

    const { data: groups } = await supabase
      .from('stress_check_group_analysis')
      .select('*')
      .eq('period_id', period.id);
    divResults = groups || [];
  }

  // 2. パルスサーベイ（Echo）のデータ取得（直近1年分など）
  // survey_period は '2023-10' のような形式を想定
  const { data: pulses } = await supabase
    .from('pulse_survey_responses')
    .select('user_id, survey_period, score, created_at')
    .eq('tenant_id', tenantId)
    .order('survey_period', { ascending: true });

  const pulseData = pulses || [];

  // user毎、period毎の平均スコアを計算
  const userPulseMap: Record<string, Record<string, { sum: number, count: number }>> = {};
  const allPeriodsSet = new Set<string>();

  for (const p of pulseData) {
    if (!p.user_id) continue;
    if (!userPulseMap[p.user_id]) userPulseMap[p.user_id] = {};
    if (!userPulseMap[p.user_id][p.survey_period]) {
      userPulseMap[p.user_id][p.survey_period] = { sum: 0, count: 0 };
    }
    userPulseMap[p.user_id][p.survey_period].sum += p.score || 0;
    userPulseMap[p.user_id][p.survey_period].count += 1;
    allPeriodsSet.add(p.survey_period);
  }

  const sortedPeriods = Array.from(allPeriodsSet).sort();

  // 3. 従業員データのマージとリスク判定
  const employees: PulseStressEmployeeData[] = [];
  
  for (const r of scResults) {
    const emp = Array.isArray(r.employees) ? r.employees[0] : r.employees;
    if (!emp || !emp.user_id) continue;

    const div = Array.isArray(emp.divisions) ? emp.divisions[0] : emp.divisions;
    
    // パルスサーベイスコア
    const userPulses = userPulseMap[emp.user_id] || {};
    const pulseScoreMap: Record<string, number> = {};
    for (const p of sortedPeriods) {
      if (userPulses[p]) {
        pulseScoreMap[p] = Number((userPulses[p].sum / userPulses[p].count).toFixed(1));
      }
    }

    // 離職リスク条件B: 直近3つの期間で連続下降しているか
    let pulseTrendDown = false;
    const availablePeriods = sortedPeriods.filter(p => pulseScoreMap[p] !== undefined);
    if (availablePeriods.length >= 3) {
      const last3 = availablePeriods.slice(-3);
      const s1 = pulseScoreMap[last3[0]];
      const s2 = pulseScoreMap[last3[1]];
      const s3 = pulseScoreMap[last3[2]];
      if (s3 < s2 && s2 < s1) {
        pulseTrendDown = true;
      }
    }

    // ストレスチェック条件A: 「上司からのサポート」または C領域が低い
    // C領域の合計(score_c)が高い（ストレス判定では低い点数=高ストレス）か、scale_scoresを分解
    let bossSupport = 3; 
    let calcRisk = 100;
    if (Array.isArray(r.scale_scores)) {
      const boss = r.scale_scores.find((s: any) => s.scaleName === '上司からのサポート');
      if (boss) bossSupport = boss.evalPoint;
    }
    // 擬似的な健康リスク値（個別）
    calcRisk = 100 + ((r.score_b || 0) - 60) * 0.5;

    let warningLevel: 'high' | 'medium' | 'low' = 'low';
    if (bossSupport <= 2 && pulseTrendDown) {
      warningLevel = 'high';
    } else if (pulseTrendDown || r.is_high_stress) {
      warningLevel = 'medium';
    }

    employees.push({
      employeeId: r.employee_id,
      userId: emp.user_id,
      name: emp.name || '不明',
      divisionName: div?.name || '未設定',
      stressCheckScores: r.scale_scores,
      bossSupportEvalList: bossSupport,
      healthRisk: Math.round(calcRisk),
      isHighStress: r.is_high_stress,
      pulseScores: pulseScoreMap,
      pulseTrendDown,
      warningLevel
    });
  }

  // 4. 部署ごとの散布図用データ
  const departments: PulseStressDepartmentData[] = [];
  // divResults と pulse の全体平均をマージ
  const deptPulseMap: Record<string, { sum: number, count: number }> = {};
  
  for (const emp of employees) {
    const recentPeriods = sortedPeriods.slice(-3);
    let avg = 0; let c = 0;
    for (const p of recentPeriods) {
      if (emp.pulseScores[p]) {
        avg += emp.pulseScores[p];
        c++;
      }
    }
    if (c > 0) {
      if (!deptPulseMap[emp.divisionName]) deptPulseMap[emp.divisionName] = { sum: 0, count: 0 };
      deptPulseMap[emp.divisionName].sum += (avg / c);
      deptPulseMap[emp.divisionName].count += 1;
    }
  }

  for (const dr of divResults) {
    const dName = dr.group_name || '不明';
    const hr = dr.total_health_risk || 100;
    let avgPulse = 3.0;
    if (deptPulseMap[dName]) {
      avgPulse = Number((deptPulseMap[dName].sum / deptPulseMap[dName].count).toFixed(2));
    }
    departments.push({
      divisionName: dName,
      healthRisk: hr,
      avgPulseScore: avgPulse
    });
  }

  // もしdivResultsが取れなかった場合のフォールバック
  if (departments.length === 0) {
    for (const [dName, pdata] of Object.entries(deptPulseMap)) {
      departments.push({
        divisionName: dName,
        healthRisk: 100, // 不明な場合は100
        avgPulseScore: Number((pdata.sum / pdata.count).toFixed(2))
      });
    }
  }

  // 5. トレンドチャート用（全体平均）
  const chartData: PulseStressChartData[] = [];
  for (const p of sortedPeriods) {
    let sum = 0; let c = 0;
    for (const emp of employees) {
      if (emp.pulseScores[p]) {
        sum += emp.pulseScores[p];
        c++;
      }
    }
    const val = c > 0 ? Number((sum / c).toFixed(2)) : 0;
    // 総合健康リスクは年1回だが、便宜上全体平均をフラットに繋ぐ
    chartData.push({
      period: p,
      pulseAvg: val,
      stressRiskArea: divResults.length > 0 ? Number(divResults.reduce((acc, curr) => acc + (curr.total_health_risk || 100), 0) / divResults.length) : 100
    });
  }

  return {
    employees: employees.sort((a, b) => a.warningLevel === 'high' ? -1 : 1),
    departments,
    chartData,
    periods: sortedPeriods
  };
}
