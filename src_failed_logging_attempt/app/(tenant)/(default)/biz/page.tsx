'use client'

import React from 'react';
import { 
  ClipboardList, 
  CheckCircle, 
  Calendar,
  UserCheck,
  Receipt,
  Plane,
  FolderPlus,
  Users,
  DollarSign,
  Package,
  Headphones
} from 'lucide-react';
import { WelcomeHeader } from '@/components/layout/WelcomeHeader';
import { StatusCard } from '@/components/ui/StatusCard';
import { QuickAccessCard } from '@/components/ui/QuickAccessCard';
import { DepartmentCard } from '@/components/ui/DepartmentCard';

/**
 * 業務メニュー画面
 * 
 * ログイン後のユーザーが最初に見る業務メニュー一覧ページ
 * - ウェルカムヘッダー
 * - ステータスカード (タスク、システム状態、次の予定)
 * - クイックアクセス (よく使う機能)
 * - 部門別リソース
 */
export default function BizMenuPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ウェルカムヘッダー */}
        <WelcomeHeader 
          userName="Alex"
          notifications="You have 5 pending approvals today and a team sync at 2:00 PM. Have a productive day!"
        />

        {/* ステータスカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatusCard 
            icon={<ClipboardList className="w-6 h-6" />}
            title="Pending Tasks"
            value="5 Tasks"
            variant="warning"
          />
          <StatusCard 
            icon={<CheckCircle className="w-6 h-6" />}
            title="System Status"
            value="Normal"
            variant="success"
          />
          <StatusCard 
            icon={<Calendar className="w-6 h-6" />}
            title="Next Meeting"
            value="2:00 PM"
            variant="info"
          />
        </div>

        {/* Quick Access */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-primary">⚡</span>
            <h2 className="text-xl font-bold text-gray-900">Quick Access</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <QuickAccessCard 
              icon={<UserCheck className="w-8 h-8" />}
              title="Record Attendance"
              href="/biz/hr/attendance"
            />
            <QuickAccessCard 
              icon={<Receipt className="w-8 h-8" />}
              title="Submit Expense"
              href="/biz/accounting/expense"
            />
            <QuickAccessCard 
              icon={<Plane className="w-8 h-8" />}
              title="Request Leave"
              href="/biz/hr/leave"
            />
            <QuickAccessCard 
              icon={<FolderPlus className="w-8 h-8" />}
              title="New Project"
              href="/biz/projects/new"
            />
          </div>
        </div>

        {/* Departmental Resources */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Departmental Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <DepartmentCard 
              title="Human Resources"
              icon={<Users className="w-5 h-5" />}
              items={[
                { label: "View Payslip", href: "/biz/hr/payroll" },
                { label: "Training Center", href: "/biz/hr/training" },
                { label: "Company Benefits", href: "/biz/hr/benefits" }
              ]}
            />
            <DepartmentCard 
              title="Finance"
              icon={<DollarSign className="w-5 h-5" />}
              items={[
                { label: "Budget Reports", href: "/biz/finance/budget" },
                { label: "Vendor Invoices", href: "/biz/finance/invoices" },
                { label: "Reimbursements", href: "/biz/finance/reimbursements" }
              ]}
            />
            <DepartmentCard 
              title="Logistics"
              icon={<Package className="w-5 h-5" />}
              items={[
                { label: "Fleet Status", href: "/biz/logistics/fleet" },
                { label: "Inventory Tracking", href: "/biz/logistics/inventory" },
                { label: "Shipping Orders", href: "/biz/logistics/shipping" }
              ]}
            />
            <DepartmentCard 
              title="IT Support"
              icon={<Headphones className="w-5 h-5" />}
              items={[
                { label: "Raise Support Ticket", href: "/biz/it/support" },
                { label: "Knowledge Base", href: "/biz/it/kb" },
                { label: "Hardware Request", href: "/biz/it/hardware" }
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
