'use client';

import React, { useState } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { fetchMarketJobs, JobResult } from '../actions';

export default function MarketAnalysisDashboard() {
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setHasSearched(true);
    
    // 検索クエリの作成
    const queryParts = [];
    if (jobTitle.trim()) queryParts.push(jobTitle.trim());
    if (location.trim()) queryParts.push(location.trim());
    if (keyword.trim()) queryParts.push(keyword.trim());
    const query = queryParts.join(' ');

    if (!query) {
      setError('検索条件を入力してください。');
      setIsLoading(false);
      return;
    }

    try {
      const results = await fetchMarketJobs(query);
      setJobs(results);
    } catch (err: any) {
      setError(err.message || 'データ取得中にエラーが発生しました。');
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">採用市場・競合分析ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">
            入力された条件をもとに、Web上の求人情報を網羅する検索エンジンをリアルタイムに解析し、日本中の最新データを一括取得します。
          </p>
        </div>
      </div>

      {/* 検索カード */}
      <Card variant="default">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-2">
              <label htmlFor="jobTitle" className="text-sm font-medium text-gray-700">
                職種 <span className="text-red-500">*</span>
              </label>
              <input
                id="jobTitle"
                type="text"
                placeholder="例: Reactエンジニア、プロダクトマネージャー"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label htmlFor="location" className="text-sm font-medium text-gray-700">
                勤務地
              </label>
              <input
                id="location"
                type="text"
                placeholder="例: 東京、大阪、フルリモート"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label htmlFor="keyword" className="text-sm font-medium text-gray-700">
                フリーワード
              </label>
              <input
                id="keyword"
                type="text"
                placeholder="例: 年収1000万、フレックス"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  分析中...
                </>
              ) : (
                '市場データを分析する'
              )}
            </Button>
          </div>
        </form>
      </Card>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 結果表示 */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} variant="default" className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mt-4"></div>
            </Card>
          ))}
        </div>
      ) : hasSearched && jobs.length === 0 && !error ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">該当する求人が見つかりませんでした</h3>
          <p className="mt-1 text-sm text-gray-500">検索条件を変更して再度お試しください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job, idx) => {
            // SerpApiのレスポンスに基づく元求人リンクの取得
            const jobUrl = job.apply_options?.[0]?.link || job.share_link;

            return (
            <Card key={job.job_id || idx} variant="default" className="flex flex-col h-full hover:shadow-lg transition-shadow border-t-4 border-t-primary">
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-gray-900 line-clamp-2 leading-tight mb-2">
                    {job.title}
                  </h3>
                </div>
                
                <div className="mt-2 space-y-1">
                  {job.company_name && (
                    <div className="flex items-center text-sm text-gray-600 font-medium">
                      <svg className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {job.company_name}
                    </div>
                  )}
                  {job.location && (
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {job.location}
                    </div>
                  )}
                  {job.via && (
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {jobUrl ? (
                        <a 
                          href={jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-blue-700 hover:underline inline-flex items-center gap-1 transition-colors cursor-pointer font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {job.via}
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : (
                        job.via
                      )}
                    </div>
                  )}
                </div>

                {job.extensions && job.extensions.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {job.extensions.map((ext: string, i: number) => {
                      const isSalary = ext.includes('円') || ext.includes('給') || ext.includes('年収') || ext.includes('月給') || ext.includes('万');
                      return (
                        <span 
                          key={i} 
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            isSalary ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {ext}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
