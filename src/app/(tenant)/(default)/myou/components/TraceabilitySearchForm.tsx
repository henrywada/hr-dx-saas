'use client';

import { useState } from 'react';
import { Search, QrCode, XCircle } from 'lucide-react';
import QrScanner from './QrScanner';

interface TraceabilitySearchFormProps {
  onSearch: (serial: string) => void;
  isPending: boolean;
}

export default function TraceabilitySearchForm({ onSearch, isPending }: TraceabilitySearchFormProps) {
  const [inputSerial, setInputSerial] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputSerial.trim()) {
      onSearch(inputSerial.trim());
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    // QRコードの解析（DeliveryFormと同じロジックを想定）
    let serial = decodedText;
    try {
      const parts = decodedText.split(',');
      parts.forEach(part => {
        const [key, value] = part.split(':');
        if (key?.trim().toUpperCase() === 'SERIAL') serial = value?.trim();
      });
    } catch {
      serial = decodedText;
    }

    setInputSerial(serial);
    setShowScanner(false);
    onSearch(serial);
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-8">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">製品シリアル番号で検索</h2>
        <button
          onClick={() => setShowScanner(!showScanner)}
          className={`flex items-center space-x-1 text-xs px-3 py-1.5 rounded-full transition-colors ${
            showScanner ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          }`}
        >
          {showScanner ? (
            <>
              <XCircle className="h-3.5 w-3.5" />
              <span>キャンセル</span>
            </>
          ) : (
            <>
              <QrCode className="h-3.5 w-3.5" />
              <span>QRスキャン</span>
            </>
          )}
        </button>
      </div>

      <div className="p-6">
        {showScanner ? (
          <div className="mb-6">
            <QrScanner onScanSuccess={handleScanSuccess} />
            <p className="text-center text-xs text-gray-500 mt-2">
              製品ラベルのQRコードをスキャンしてください
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={inputSerial}
                onChange={(e) => setInputSerial(e.target.value)}
                placeholder="シリアル番号を入力（例: S-20240310-001）"
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isPending || !inputSerial.trim()}
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-bold rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                '履歴を照会する'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
