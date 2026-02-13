'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between rounded-lg bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
          >
            Sign out
          </button>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Dashboard content will go here */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="w-0 flex-1">
                  <dt className="truncate text-sm font-medium text-gray-500">
                    Welcome to HR DX SaaS
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      Select an app from the menu
                    </div>
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
