interface ProgressIndicatorProps {
  label: string
  completed: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function ProgressIndicator({ label, completed, size = 'md' }: ProgressIndicatorProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
          completed
            ? 'bg-green-500 text-white shadow-md scale-110'
            : 'bg-gray-200 text-gray-400'
        }`}
      >
        {completed ? '✓' : '○'}
      </div>
      <span
        className={`text-sm font-semibold transition-colors ${
          completed ? 'text-green-600' : 'text-gray-400'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

