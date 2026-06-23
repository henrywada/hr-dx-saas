'use client';

import { useRouter } from 'next/navigation';
import type { HighStressListItem } from '@/features/adm/high-stress-followup/types';
import { DetailPane } from './DetailPane';

interface Props {
  item: HighStressListItem;
  periodId: string;
}

/**
 * 個別詳細ページ用：DetailPane をラップし、保存後に router.refresh を実行
 */
export function DetailPaneClient({ item, periodId }: Props) {
  const router = useRouter();
  return (
    <DetailPane
      item={item}
      periodId={periodId}
      onRecordSaved={() => router.refresh()}
    />
  );
}
