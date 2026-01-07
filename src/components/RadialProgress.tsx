interface RadialProgressProps {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
}

export default function RadialProgress({
  percentage,
  size = 120,
  strokeWidth = 10,
  color = 'indigo',
}: RadialProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  const colorClasses = {
    indigo: 'stroke-indigo-600',
    purple: 'stroke-purple-600',
    blue: 'stroke-blue-600',
    green: 'stroke-green-600',
    orange: 'stroke-orange-600',
    pink: 'stroke-pink-600',
    white: 'stroke-white',
  }
  
  const textColorClasses = {
    indigo: 'text-indigo-600',
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    pink: 'text-pink-600',
    white: 'text-white',
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${colorClasses[color as keyof typeof colorClasses] || colorClasses.indigo} transition-all duration-1000`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-2xl font-bold ${textColorClasses[color as keyof typeof textColorClasses] || 'text-gray-900'}`}>
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  )
}

