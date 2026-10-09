import type { LucideIcon } from "lucide-react"

interface TabEmptyProps {
  icon: LucideIcon
  title: string
  description: string
}

export function TabEmpty({ icon: Icon, title, description }: TabEmptyProps) {
  return (
    <div className='py-14 text-center'>
      <Icon
        className='mx-auto mb-3 h-5 w-5 text-muted'
        strokeWidth={1.5}
        aria-hidden='true'
      />
      <h4 className='mb-1 text-sm font-bold'>{title}</h4>
      <p className='mx-auto max-w-sm text-[13px] leading-relaxed text-muted'>
        {description}
      </p>
    </div>
  )
}
