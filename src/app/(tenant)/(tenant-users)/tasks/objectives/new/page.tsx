import { ObjectiveForm } from '@/features/task-management/components/ObjectiveForm'

export default function NewObjectivePage() {
  return (
    <div className="w-full px-4 sm:px-6 py-5 mx-auto max-w-[1200px]">
      <h1 className="text-lg font-semibold text-slate-900 mb-4">新しい目標を作成</h1>
      <ObjectiveForm />
    </div>
  )
}
