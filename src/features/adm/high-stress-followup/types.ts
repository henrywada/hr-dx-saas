/** 高ストレス者リスト用（匿名表示） */
export interface HighStressListItem {
  stressResultId: string;
  employeeId: string;
  anonymousId: string;
  divisionAnonymousLabel: string;
  calculatedAt: string;
  highStressReason: string | null;
  interviewRequested: boolean;
  /** 最新の面接記録のステータス */
  latestStatus: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  /** 措置決定済みか（measure_type が設定されている completed レコードがある） */
  hasMeasureDecided: boolean;
}

/** 面接記録（stress_interview_records） */
export interface StressInterviewRecord {
  id: string;
  tenantId: string;
  stressResultId: string;
  doctorId: string;
  intervieweeId: string;
  interviewDate: string;
  interviewDuration: number | null;
  interviewNotes: string | null;
  doctorOpinion: string | null;
  measureType: string | null;
  measureDetails: string | null;
  followUpDate: string | null;
  followUpStatus: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  /** 結合で取得 */
  doctorName?: string;
}

/** 予約・実施カレンダー用 */
export interface ScheduledInterviewItem {
  id: string;
  stressResultId: string;
  intervieweeId: string;
  anonymousId: string;
  interviewDate: string;
  doctorName: string;
  status: string;
}
