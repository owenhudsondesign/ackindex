'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, FileText, TrendingUp, RefreshCw } from 'lucide-react'

interface Budget {
  id: string
  name: string
  year: number
  municipality: string
  total_budget: number
  file_path: string
  created_at: string
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBudgets = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/budgets')
      if (!response.ok) {
        throw new Error('Failed to fetch budgets')
      }
      const data = await response.json()
      setBudgets(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      // Fallback to mock data
      setBudgets([
        {
          id: '1',
          name: '2025 Annual Town Meeting Warrant',
          year: 2025,
          municipality: 'Nantucket, MA',
          total_budget: 117300000,
          file_path: '/budgets/2025-warrant.pdf',
          created_at: '2024-01-15T00:00:00Z'
        },
        {
          id: '2',
          name: 'Forecast FY23-FY33',
          year: 2023,
          municipality: 'Nantucket, MA',
          total_budget: 123200000,
          file_path: '/budgets/forecast-fy23-33.pdf',
          created_at: '2024-01-10T00:00:00Z'
        },
        {
          id: '3',
          name: 'Sample Budget 2023',
          year: 2023,
          municipality: 'Sample City, MA',
          total_budget: 50000000,
          file_path: '/budgets/sample-2023.pdf',
          created_at: '2024-01-05T00:00:00Z'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBudgets()
  }, [])

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
    return ((117300000 / 1000000000) * 0.15 * 100).toFixed(2)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
          <p className="text-dark-gray/70">Loading budgets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-dark-gray">Budget Documents</h1>
          <button
            onClick={fetchBudgets}
            className="inline-flex items-center px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-brand-blue/90 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800">
              <strong>Note:</strong> {error}. Showing sample data below.
            </p>
          </div>
        )}

        {budgets.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white p-8 rounded-lg shadow-brand max-w-md mx-auto">
              <FileText className="h-12 w-12 text-brand-blue mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-dark-gray mb-2">No Budgets Available</h3>
              <p className="text-dark-gray/70 mb-6">
                Budget documents will appear here once uploaded and processed.
              </p>
              <Link 
                href="/admin/import"
                className="inline-flex items-center px-6 py-3 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors"
              >
                Upload Budget
                <FileText className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgets.map((budget) => (
              <div key={budget.id} className="bg-white rounded-lg shadow-brand hover:shadow-brand-lg transition-all duration-300 overflow-hidden">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
