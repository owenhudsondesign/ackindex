'use client'

import { TrendingUp, Calendar, Calculator, PieChart } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatsCardsProps {
  stats: {
    totalBudgets: number
    latestFY: string
    avgTaxRate: number
    categoriesAnalyzed: number
  }
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      icon: PieChart,
      value: stats.totalBudgets.toString(),
      label: 'Total Budgets',
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      icon: Calendar,
      value: stats.latestFY,
      label: 'Latest FY',
      change: 'Current',
      changeType: 'neutral' as const
    },
    {
      icon: Calculator,
      value: `${stats.avgTaxRate.toFixed(2)}%`,
      label: 'Avg Tax Rate',
      change: '+0.3%',
      changeType: 'positive' as const
    },
    {
      icon: TrendingUp,
      value: stats.categoriesAnalyzed.toString(),
      label: 'Categories Analyzed',
      change: '+8',
      changeType: 'positive' as const
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-lg shadow-brand hover:shadow-brand-lg transition-all duration-300 hover:-translate-y-1"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <card.icon className="h-8 w-8 text-brand-blue" />
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                card.changeType === 'positive' 
                  ? 'text-green-700 bg-green-100' 
                  : card.changeType === 'negative'
                  ? 'text-red-700 bg-red-100'
                  : 'text-dark-gray bg-light-gray'
              }`}>
                {card.change}
              </span>
            </div>
            <div className="text-3xl font-bold text-text-black mb-1">
              {card.value}
            </div>
            <div className="text-sm text-dark-gray">
              {card.label}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
