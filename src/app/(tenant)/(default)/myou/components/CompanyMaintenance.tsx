'use client';

import { useState, useTransition } from 'react';
import { upsertCompany, deleteCompany } from '@/features/myou/actions';
import { Plus, Edit2, Trash2, Mail, Building2, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface Company {
  company_id: string;
  company_name: string;
  email_address: string;
}

interface Props {
  initialCompanies: Company[];
}

export default function CompanyMaintenance({ initialCompanies }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({ name: '', email_address: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleEdit = (company: Company) => {
    setEditCompany(company);
    setFormData({ name: company.company_name, email_address: company.email_address || '' });
    setShowForm(true);
    setStatus(null);
  };

  const handleAddNew = () => {
    setEditCompany(null);
    setFormData({ name: '', email_address: '' });
    setShowForm(true);
    setStatus(null);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`施工会社「${name}」を削除してもよろしいですか？\n※この会社に関連付けられた納入履歴がある場合、エラーとなる可能性があります。`)) return;

    startTransition(async () => {
      const result = await deleteCompany(id);
      if (result.success) {
        setStatus({ type: 'success', message: '削除が完了しました。' });
      } else {
        setStatus({ type: 'error', message: result.error || '削除に失敗しました。' });
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    startTransition(async () => {
      const result = await upsertCompany({
        id: editCompany?.company_id,
        name: formData.name,
        email_address: formData.email_address
      });

      if (result.success) {
        setStatus({ type: 'success', message: editCompany ? '更新が完了しました。' : '新規登録が完了しました。' });
        setShowForm(false);
      } else {
        setStatus({ type: 'error', message: result.error || '保存に失敗しました。' });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 操作フィードバック */}
      {status && (
        <div className={`p-4 rounded-xl flex items-center space-x-3 animate-in fade-in slide-in-from-top-2 border ${
          status.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {status.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-sm font-bold">{status.message}</span>
          <button onClick={() => setStatus(null)} className="ml-auto text-xs opacity-60 hover:opacity-100 uppercase tracking-tighter">Close</button>
        </div>
      )}

      {/* リスト・テーブル */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-8 py-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Building2 className="h-5 w-5" />
             </div>
             <h2 className="text-lg font-black text-gray-900">施工会社一覧</h2>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 shadow-md shadow-blue-200"
          >
            <Plus className="h-4 w-4" />
            <span>新規登録</span>
          </button>
        </div>

        <div className="overflow-x-auto p-4 sm:p-6">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="text-left py-3 border-b-2 border-gray-50 uppercase tracking-widest text-[10px] font-black text-gray-400">
                <th className="px-4 pb-4">会社名</th>
                <th className="px-4 pb-4">メールアドレス (アラート送信先)</th>
                <th className="px-4 pb-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {initialCompanies.length > 0 ? (
                initialCompanies.map((company) => (
                  <tr key={company.company_id} className="group hover:bg-blue-50/50 transition-all">
                    <td className="px-4 py-5 whitespace-nowrap">
                      <div className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{company.company_name}</div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500 font-medium">
                        <Mail className="h-3.5 w-3.5 mr-2 opacity-40" />
                        {company.email_address || <span className="text-gray-300 italic">未設定</span>}
                      </div>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => handleEdit(company)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                          title="編集"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(company.company_id, company.company_name)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                          title="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                       <Building2 className="h-12 w-12 text-gray-200" />
                       <div className="text-gray-400 font-medium">施工会社がまだ登録されていません。</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* フォームモーダル (簡易版) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 flex items-center justify-between text-white">
              <h3 className="text-xl font-black">{editCompany ? '施工会社を編集' : '新しい施工会社'}</h3>
              <button 
                onClick={() => setShowForm(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                disabled={isPending}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">会社名 *</label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                    placeholder="株式会社 〇〇"
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">メールアドレス</label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email_address}
                    onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                    className="w-full px-5 py-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all font-bold text-gray-900"
                    placeholder="contact@example.com"
                  />
                  <p className="mt-2 text-[10px] text-gray-400 font-medium leading-relaxed italic">※有効期限アラートの通知および業務連絡に使用されます。</p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3.5 border border-gray-200 text-gray-600 text-sm font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                  disabled={isPending}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isPending || !formData.name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl text-sm font-black transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center space-x-2"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>保存中...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{editCompany ? '更新する' : '登録する'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
