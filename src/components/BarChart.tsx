'use client'

interface BarChartProps {
  data: { name: string; value: number; color?: string; originalKey?: string; index?: number }[]
  height?: number
}

export default function BarChart({ data, height = 300 }: BarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value), 1)

  const defaultColors = [
    'bg-gradient-to-t from-indigo-500 to-indigo-600',
    'bg-gradient-to-t from-purple-500 to-purple-600',
    'bg-gradient-to-t from-blue-500 to-blue-600',
    'bg-gradient-to-t from-green-500 to-green-600',
    'bg-gradient-to-t from-orange-500 to-orange-600',
    'bg-gradient-to-t from-pink-500 to-pink-600',
  ]

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-4 h-[300px]">
        {data.map((item, index) => {
          const heightPercentage = (item.value / maxValue) * 100
          const colorClass = item.color || defaultColors[index % defaultColors.length]
          // Use originalKey or index for unique key
          const uniqueKey = item.originalKey || `${item.name}-${item.index !== undefined ? item.index : index}`
          
          return (
            <div key={uniqueKey} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="relative w-full flex items-end justify-center h-full">
                <div
                  className={`w-full ${colorClass} rounded-t-lg shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 relative overflow-hidden`}
                  style={{ height: `${heightPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 group-hover:bg-white/30 transition-all"></div>
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs font-semibold px-2 py-1 rounded whitespace-nowrap">
                    {item.value}
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-600 text-center min-h-[40px] flex items-center">
                {item.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

