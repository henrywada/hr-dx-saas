import { JobPosting } from '@/features/job-postings/types'

export function generateHelloWorkCSV(jobs: JobPosting[]): string {
  // ハローワーク仕様のCSVヘッダー
  const header = [
    '求人区分', 
    '事業所番号', 
    '職種', 
    '仕事内容', 
    '雇用形態', 
    '就業場所_郵便番号', 
    '就業場所_住所', 
    '基本給_下限', 
    '基本給_上限'
  ]

  const escapeCsvField = (field: string | null | undefined): string => {
    if (field === null || field === undefined) return '""';
    const escaped = String(field).replace(/"/g, '""');
    return `"${escaped}"`;
  }

  const stripHtml = (html: string | null | undefined): string => {
    if (!html) return ''
    return html.replace(/<[^>]*>?/gm, '')
      // また、余分な空白や改行をある程度整える
      .replace(/&nbsp;/g, ' ')
      .trim()
  }

  const mapEmploymentType = (type: JobPosting['employment_type']) => {
    switch (type) {
      case 'FULL_TIME': return '正社員'
      case 'PART_TIME': return 'パート労働者'
      case 'CONTRACTOR': return '契約社員'
      case 'TEMPORARY': return '派遣社員'
      case 'INTERN': return 'インターン'
      default: return 'その他'
    }
  }

  const rows = jobs.map(job => {
    const address = `${job.address_region || ''}${job.address_locality || ''}${job.street_address || ''}`
    
    return [
      '一般（フルタイム）', // ハローワーク側の「求人区分」固定値または可変
      '', // 事業所番号は別途入力などの要件が来るまで空欄・またはテナントマスタ等から取得
      job.title || '',
      stripHtml(job.description),
      mapEmploymentType(job.employment_type),
      job.postal_code || '',
      address,
      job.salary_min?.toString() || '',
      job.salary_max?.toString() || ''
    ].map(escapeCsvField).join(',')
  })

  // UTF-8での文字化けを防ぐため、文字列の先頭にBOM（\uFEFF）を付与する
  const csvContent = [header.map(escapeCsvField).join(','), ...rows].join('\n')
  return '\uFEFF' + csvContent
}
