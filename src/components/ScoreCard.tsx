interface ScoreCardProps {
  title: string
  value: number | string
  maxValue?: number
  color?: string
  icon?: string
}

export default function ScoreCard({ title, value, maxValue, color = 'blue', icon }: ScoreCardProps) {
  const percentage = maxValue ? (Number(value) / maxValue) * 100 : 0
  const colorClasses = {
    indigo: 'from-indigo-500 to-indigo-600',
    purple: 'from-purple-500 to-purple-600',
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    pink: 'from-pink-500 to-pink-600',
  }

  return (
    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {title}
            </h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {value || 'N/A'}
            </span>
            {maxValue && (
              <span className="text-base text-gray-500">/ {maxValue}</span>
            )}
          </div>
        </div>
      </div>
      {maxValue && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue} rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{percentage.toFixed(1)}%</p>
        </div>
      )}
    </div>
  )
}

