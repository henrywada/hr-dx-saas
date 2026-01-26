import { getVersionString } from '@/lib/version'

export function VersionFooter() {
  const versionString = getVersionString()
  
  return (
    <div className="text-xs text-muted-foreground text-center py-4 border-t mt-8">
      {versionString}
    </div>
  )
}
