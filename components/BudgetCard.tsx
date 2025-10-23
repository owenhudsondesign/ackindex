'use client'

import { motion } from 'framer-motion'
import { Calendar, FileText, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface BudgetCardProps {
  budget: {
    id: string
    name: string
    year: number
    municipality: string
    total_budget: number
    file_path: string
    created_at: string
  }
}

export default function BudgetCard({ budget }: BudgetCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getTaxRate = () => {
    // Estimated tax rate based on budget size
    // This would be calculated from actual tax data in a real implementation
    return ((budget.total_budget / 1000000000) * 0.15 * 100).toFixed(2)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-lg shadow-brand hover:shadow-brand-lg transition-all duration-300 overflow-hidden"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-dark-gray mb-1 line-clamp-2">
              {budget.name}
            </h3>
            <div className="flex items-center text-sm text-dark-gray/70">
              <Calendar className="h-4 w-4 mr-1" />
              {budget.year} • {budget.municipality}
            </div>
          </div>
          <div className="ml-4">
            <div className="bg-brand-blue/10 text-brand-blue px-2 py-1 rounded-full text-xs font-medium">
              FY{budget.year.toString().slice(-2)}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-2xl font-bold text-text-black">
              {formatCurrency(budget.total_budget)}
            </div>
            <div className="text-xs text-dark-gray/70">Total Budget</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-black">
              {getTaxRate()}%
            </div>
            <div className="text-xs text-dark-gray/70">Est. Tax Rate</div>
          </div>
        </div>

        {/* Mini Chart Placeholder */}
        <div className="h-16 bg-light-gray rounded-lg mb-4 flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-brand-blue" />
          <span className="text-sm text-dark-gray/70 ml-2">Budget Breakdown</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-dark-gray/70">
            Uploaded {formatDate(budget.created_at)}
          </div>
          <Link
            href={`/budgets/${budget.id}`}
            className="inline-flex items-center px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-brand-blue/90 transition-colors text-sm font-medium"
          >
            View Details →
          </Link>
        </div>
      </div>
    </motion.div>
  )
}