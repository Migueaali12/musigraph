interface LoadingProps {
  message?: string
  size?: "sm" | "md" | "lg"
}

export function Loading({
  message = "Cargando...",
  size = "md",
}: LoadingProps) {
  const textClasses = {
    sm: "text-xs",
    md: "text-[13px]",
    lg: "text-[15px]",
  }

  return (
    <div
      role='status'
      aria-live='polite'
      className='flex flex-col items-center justify-center gap-2 p-8'
    >
      <p className={`text-muted ${textClasses[size]}`}>{message}</p>
      <span aria-hidden='true' className='blink cursor-block text-muted' />
    </div>
  )
}
