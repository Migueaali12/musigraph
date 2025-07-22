interface LoadingProps {
  message?: string
  size?: "sm" | "md" | "lg"
}

export function Loading({
  message = "Cargando...",
  size = "md",
}: LoadingProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  return (
    <div className='flex flex-col items-center justify-center p-8'>
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-coral-vibrant border-t-transparent`}
      />
      <p className='mt-4 text-white text-center'>{message}</p>
    </div>
  )
}
