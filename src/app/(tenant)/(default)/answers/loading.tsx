import { Skeleton } from '@/components/ui/Skeleton';

export default function AnswersLoading() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div>
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
