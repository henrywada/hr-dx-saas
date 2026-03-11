'use client';

import { useRouter } from 'next/navigation';
import { Download, FileText, CheckCircle2 } from 'lucide-react';

export interface GovReportSummary {
  period_id: string;
  period_title: string;
  fiscal_year: number;
  
  targetWorkers: number;
  testedWorkers: number;
  highStressWorkers: number;
  interviewedWorkers: number;
  
  opinionNormal: number;
  opinionRestricted: number;
  opinionLeave: number;
}

interface PeriodOption {
  id: string;
  title: string;
  fiscal_year: number;
}

interface Props {
  periods: PeriodOption[];
  selectedPeriodId: string;
  summary: GovReportSummary;
}

export default function GovReportClient({ periods, selectedPeriodId, summary }: Props) {
  const router = useRouter();

  // 年度期間変更によるルーティング遷移
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const periodId = e.target.value;
    router.push(`/adm/gov-report?periodId=${periodId}`);
  };

  // CSVとしてエクスポート (BOM付与でExcel対応)
  const handleExportCSV = () => {
    const headers = [
      '実施年度',
      '件名',
      '検査を実施した事業場の在籍労働者数',
      '検査を実施した労働者数',
      '高ストレス者として選定された労働者数',
      '面接指導を受けた労働者数',
      '面接指導結果: 通常勤務',
      '面接指導結果: 就業制限',
      '面接指導結果: 要休業'
    ];

    const rowData = [
      `${summary.fiscal_year}年度`,
      summary.period_title,
      summary.targetWorkers.toString(),
      summary.testedWorkers.toString(),
      summary.highStressWorkers.toString(),
      summary.interviewedWorkers.toString(),
      summary.opinionNormal.toString(),
      summary.opinionRestricted.toString(),
      summary.opinionLeave.toString()
    ];

    // CSV フォーマットに変換（シンプルな形式）
    const csvContent = `${headers.join(',')}\n${rowData.join(',')}`;

    // BOM を追加して文字化けを防止 (Excelで開くため)
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ストレスチェック労基署報告データ_${summary.fiscal_year}年度.csv`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="w-full md:w-auto flex items-center gap-3">
          <label className="text-sm font-bold text-gray-700 whitespace-nowrap">
            集計対象の期間:
          </label>
          <select
            value={selectedPeriodId}
            onChange={handlePeriodChange}
            className="w-full md:w-64 text-sm rounded-lg border border-gray-300 py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {p.fiscal_year}年度 - {p.title}
              </option>
            ))}
          </select>
        </div>
        
        <button
          onClick={handleExportCSV}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          CSVでダウンロードする
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <SummaryCard 
          title="対象の全労働者数" 
          value={summary.targetWorkers} 
          unit="名" 
          description="検査を実施した事業場の在籍労働者数"
        />
        <SummaryCard 
          title="検査を実施した労働者数" 
          value={summary.testedWorkers} 
          unit="名" 
          description="対象期間内に回答を完了した人数 (実施割合: {rate}%)"
          rate={summary.targetWorkers > 0 ? Math.round((summary.testedWorkers / summary.targetWorkers) * 100) : 0}
        />
        <SummaryCard 
          title="高ストレス者数" 
          value={summary.highStressWorkers} 
          unit="名" 
          description="高ストレスと判定された総数 (出現率: {rate}%)"
          rate={summary.testedWorkers > 0 ? Math.round((summary.highStressWorkers / summary.testedWorkers) * 100) : 0}
        />
        <SummaryCard 
          title="面接指導を受けた数" 
          value={summary.interviewedWorkers} 
          unit="名" 
          description="産業医による結果の面談を完了した労働者の総数"
        />
      </div>

      {/* 面接指導結果に基づく内訳テーブル */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-gray-800">
            面接指導結果に基づく就業上の措置の内訳
          </h2>
        </div>
        <div className="p-0">
          <table className="w-full text-sm text-center">
            <thead className="text-gray-500 bg-gray-50 border-b border-gray-100 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">通常勤務</th>
                <th className="px-6 py-4 font-semibold">就業制限</th>
                <th className="px-6 py-4 font-semibold">要休業</th>
                <th className="px-6 py-4 font-semibold text-gray-400">合計（面談実施数）</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              <tr>
                <td className="px-6 py-5 font-bold text-lg">{summary.opinionNormal} <span className="text-sm font-normal text-gray-400">名</span></td>
                <td className="px-6 py-5 font-bold text-lg text-amber-600">{summary.opinionRestricted} <span className="text-sm font-normal text-gray-400">名</span></td>
                <td className="px-6 py-5 font-bold text-lg text-rose-600">{summary.opinionLeave} <span className="text-sm font-normal text-gray-400">名</span></td>
                <td className="px-6 py-5 font-bold text-lg text-gray-400">{summary.interviewedWorkers} <span className="text-sm font-normal">名</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, unit, description, rate }: { title: string; value: number; unit: string; description: string; rate?: number }) {
  const descRaw = description.replace('{rate}', rate !== undefined ? rate.toString() : '');
  
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center gap-2 mb-4 text-gray-500 font-bold text-sm">
        <FileText className="w-4 h-4" />
        {title}
      </div>
      <div className="mb-2">
        <span className="text-3xl font-black text-gray-900 tracking-tight">{value}</span>
        <span className="text-gray-400 font-medium ml-1.5">{unit}</span>
      </div>
      <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-50 pt-3 mt-1">
        {descRaw}
      </p>
    </div>
  );
}
