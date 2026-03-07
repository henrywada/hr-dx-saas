'use client';

import { useEffect } from 'react';

/**
 * Next.js 開発モードの Performance.measure() タイミングエラーを抑制する
 * 本番環境では何もしない
 */
export default function PerformancePatch() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const originalMeasure = performance.measure.bind(performance);
    performance.measure = function (...args: Parameters<typeof performance.measure>) {
      try {
        return originalMeasure(...args);
      } catch {
        // Next.js 開発モードの negative timestamp エラーを無視
        return undefined as unknown as PerformanceMeasure;
      }
    };

    return () => {
      performance.measure = originalMeasure;
    };
  }, []);

  return null;
}
