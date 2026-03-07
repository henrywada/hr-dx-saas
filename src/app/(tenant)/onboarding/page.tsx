import { QuickStartUI } from '@/features/onboarding/components/QuickStartUI'

export const metadata = {
  title: 'QuickStart | Smart HR App',
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50 to-white">
      <QuickStartUI />
    </div>
  )
}
