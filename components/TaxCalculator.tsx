'use client'

import { useState } from 'react'
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react'

interface TaxCalculatorProps {
  budgetYears?: Array<{
    fiscal_year: number
    tax_rate: number
    total_expenses: number
    property_valuation: number
  }>
}

export default function TaxCalculator({ budgetYears = [] }: TaxCalculatorProps) {
  // Get the latest year's data
  const latestYear = budgetYears.length > 0 ? budgetYears[budgetYears.length - 1] : null
  const currentTaxRate = latestYear?.tax_rate || 8.2
  const avgPropertyValue = latestYear?.property_valuation || 1200000
  const [propertyValue, setPropertyValue] = useState(avgPropertyValue)
  const [showComparison, setShowComparison] = useState(false)

  const calculateTax = (value: number, rate: number) => {
    return (value * rate) / 100
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const currentTax = calculateTax(propertyValue, currentTaxRate)
  
  // Calculate tax for previous year if available
  const previousYear = budgetYears.length > 1 ? budgetYears[budgetYears.length - 2] : null
  const previousTax = previousYear ? calculateTax(propertyValue, previousYear.tax_rate) : null
  const taxChange = previousTax ? currentTax - previousTax : 0

  return (
    <div className="bg-gradient-to-br from-brand-blue/10 to-brand-blue/5 rounded-lg p-6 border-l-4 border-brand-blue">
      <div className="flex items-center mb-4">
        <Calculator className="h-6 w-6 text-brand-blue mr-2" />
        <h3 className="text-xl font-semibold text-dark-gray">Tax Calculator</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div>
          <label className="block text-sm font-medium text-dark-gray mb-2">
            Your Property Value
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-gray/70">$</span>
            <input
              type="number"
              value={propertyValue}
              onChange={(e) => setPropertyValue(Number(e.target.value))}
              className="w-full pl-8 pr-4 py-3 border border-light-gray rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent text-lg"
              placeholder="1,200,000"
            />
          </div>
          <p className="text-sm text-dark-gray/70 mt-2">
            Enter your property's assessed value
          </p>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-light-gray">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-dark-gray">Annual Tax</span>
              <span className="text-xs text-dark-gray/70">FY{latestYear?.fiscal_year || '2024'}</span>
            </div>
            <div className="text-3xl font-bold text-text-black">
              {formatCurrency(currentTax)}
            </div>
            <div className="text-sm text-dark-gray/70">
              Tax Rate: {currentTaxRate.toFixed(2)}%
            </div>
          </div>

          {showComparison && previousTax && (
            <div className="bg-white p-4 rounded-lg border border-light-gray">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-dark-gray">Previous Year</span>
                <span className="text-xs text-dark-gray/70">FY{previousYear?.fiscal_year}</span>
              </div>
              <div className="text-2xl font-bold text-text-black">
                {formatCurrency(previousTax)}
              </div>
              <div className={`flex items-center text-sm ${taxChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {taxChange >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {formatCurrency(Math.abs(taxChange))} {taxChange >= 0 ? 'increase' : 'decrease'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="mt-6 bg-white p-4 rounded-lg border border-light-gray">
        <h4 className="text-sm font-medium text-dark-gray mb-3">Monthly Breakdown</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-text-black">
              {formatCurrency(currentTax / 12)}
            </div>
            <div className="text-xs text-dark-gray/70">Per Month</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-black">
              {formatCurrency(currentTax / 4)}
            </div>
            <div className="text-xs text-dark-gray/70">Per Quarter</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-text-black">
              {formatCurrency(currentTax / 365)}
            </div>
            <div className="text-xs text-dark-gray/70">Per Day</div>
          </div>
        </div>
      </div>

      {/* Comparison Toggle */}
      <div className="mt-4 text-center">
        <button
          onClick={() => setShowComparison(!showComparison)}
          className="text-sm text-brand-blue hover:text-brand-blue/80 transition-colors"
        >
          {showComparison ? 'Hide' : 'Show'} comparison with previous year
        </button>
      </div>
    </div>
  )
}