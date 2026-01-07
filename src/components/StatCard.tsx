interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  gradient?: string
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  gradient = 'from-indigo-500 to-purple-600',
}: StatCardProps) {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 group`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {subtitle && <p className="text-white/70 text-sm mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div className="text-4xl opacity-80 group-hover:scale-110 transition-transform">
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className={`flex items-center gap-1 text-sm ${
          trend === 'up' ? 'text-green-200' : trend === 'down' ? 'text-red-200' : 'text-white/70'
        }`}>
          <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  )
}

