import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-slate-500">
      <Loader2 className="w-10 h-10 animate-spin mb-4 text-slate-800" />
      <p className="animate-pulse text-sm font-medium">データを読み込んでいます...</p>
    </div>
  );
}
