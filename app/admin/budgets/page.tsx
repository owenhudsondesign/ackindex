'use client'

import { useState, useEffect } from 'react'

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

  useEffect(() => {
    fetchBudgets()
  }, [])

  const fetchBudgets = async () => {
    try {
      const response = await fetch('/api/budgets')
      const data = await response.json()
      
      if (response.ok) {
        setBudgets(data.budgets || [])
      } else {
        console.error('Error fetching budgets:', data.error)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-center">
            <div className="text-lg text-dark-gray">Loading budgets...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-dark-gray">Admin: Uploaded Budgets</h1>
          <div className="flex space-x-3">
            <button
              onClick={fetchBudgets}
              className="px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-brand-blue/90 transition-colors"
            >
              Refresh
            </button>
            <a 
              href="/admin/logout"
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </a>
          </div>
        </div>
        
        {budgets.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-brand">
            <p className="text-dark-gray/70">No budgets uploaded yet.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {budgets.map((budget) => (
              <div key={budget.id} className="bg-white p-6 rounded-lg shadow-brand">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-dark-gray">{budget.name}</h2>
                    <p className="text-dark-gray/70">{budget.municipality} • {budget.year}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-text-black">{formatCurrency(budget.total_budget)}</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-dark-gray/70"><span className="font-medium text-dark-gray">File:</span> {budget.file_path}</p>
                    <p className="text-dark-gray/70"><span className="font-medium text-dark-gray">Uploaded:</span> {formatDate(budget.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-dark-gray/70"><span className="font-medium text-dark-gray">Budget ID:</span> {budget.id}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-8">
          <a 
            href="/admin/import"
            className="inline-flex items-center px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-brand-blue/90 transition-colors"
          >
            Upload More Budgets
          </a>
        </div>
      </div>
    </div>
  )
}