import { ClipboardCheck } from 'lucide-react';

export default function StressCheckLoading() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-6 animate-pulse">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-5 py-2 rounded-full text-sm font-semibold">
          <ClipboardCheck size={16} />
          <span>ストレスチェック受検</span>
        </div>
        <div className="h-8 w-72 bg-gray-200 rounded mx-auto" />
        <div className="h-4 w-48 bg-gray-100 rounded mx-auto" />
      </div>
      <div className="h-3 bg-gray-100 rounded-full" />
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-blue-500 to-indigo-600" />
        <div className="p-6 space-y-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-gray-200 rounded-full" />
                <div className="h-4 w-3/4 bg-gray-200 rounded" />
              </div>
              <div className="grid grid-cols-4 gap-2 ml-10">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-10 bg-gray-100 rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
