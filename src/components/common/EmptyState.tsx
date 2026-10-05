import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className='flex flex-col items-center px-6 py-12 text-center'>
      <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-elevated'>
        <Icon className='h-6 w-6 text-coral-deep dark:text-coral-vibrant' />
      </div>
      <h4 className='text-lg font-semibold text-foreground'>{title}</h4>
      {description && (
        <p className='mt-2 max-w-md text-sm text-muted-foreground'>{description}</p>
      )}
    </div>
  )
}
