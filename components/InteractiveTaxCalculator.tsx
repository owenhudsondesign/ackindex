'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Calculator, TrendingUp, DollarSign } from 'lucide-react'

interface InteractiveTaxCalculatorProps {
  budgetYears?: Array<{
    fiscal_year: number
    tax_rate_residential: number
    property_valuation: number
    total_revenue: number
    total_expenses: number
  }>
}

export default function InteractiveTaxCalculator({ budgetYears = [] }: InteractiveTaxCalculatorProps) {
  const [propertyValue, setPropertyValue] = useState(2000000)

  // Calculate projections for each year
  const projections = budgetYears.map(year => ({
    year: `FY${year.fiscal_year}`,
    fiscal_year: year.fiscal_year,
    tax: Math.round((propertyValue / 1000) * year.tax_rate_residential),
    rate: year.tax_rate_residential,
    revenue: year.total_revenue,
    expenses: year.total_expenses
  }))

  const firstYear = projections[0]
  const lastYear = projections[projections.length - 1]
  const totalIncrease = lastYear ? lastYear.tax - firstYear.tax : 0
  const percentIncrease = firstYear ? ((totalIncrease / firstYear.tax) * 100) : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-lg shadow-brand p-8">
      <div className="flex items-center mb-6">
        <Calculator className="h-8 w-8 text-brand-blue mr-3" />
        <h2 className="text-3xl font-bold text-dark-gray">Calculate Your Property Taxes</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-dark-gray mb-2">
              Your Property Value
            </label>
            <div className="space-y-4">
              <input
                type="range"
                min="500000"
                max="10000000"
                step="100000"
                value={propertyValue}
                onChange={(e) => setPropertyValue(Number(e.target.value))}
                className="w-full h-2 bg-light-gray rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-sm text-dark-gray/70">
                <span>$500K</span>
                <span>$10M</span>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-brand-blue">
                  {formatCurrency(propertyValue)}
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          {firstYear && lastYear && (
            <div className="bg-brand-blue/5 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-gray/70">Starting Tax (FY{firstYear.fiscal_year})</span>
                <span className="font-semibold text-text-black">{formatCurrency(firstYear.tax)}/year</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-gray/70">Projected Tax (FY{lastYear.fiscal_year})</span>
                <span className="font-semibold text-text-black">{formatCurrency(lastYear.tax)}/year</span>
              </div>
              <div className="border-t border-brand-blue/20 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-dark-gray">Total Increase</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(totalIncrease)} ({percentIncrease.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chart Section */}
        <div>
          <h3 className="text-lg font-semibold text-dark-gray mb-4">Tax Projection Trend</h3>
          {projections.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projections}>
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#4d4d4d' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#4d4d4d' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Annual Tax']}
                    labelFormatter={(label) => `Fiscal Year ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #efefef',
                      borderRadius: '8px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tax" 
                    stroke="#2e90c6" 
                    strokeWidth={3}
                    dot={{ fill: '#2e90c6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#2e90c6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center bg-light-gray rounded-lg">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 text-brand-blue mx-auto mb-2" />
                <p className="text-dark-gray/70">No projection data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Year-by-Year Breakdown */}
      {projections.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-dark-gray mb-4">Year-by-Year Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {projections.map((projection, index) => (
              <div key={projection.fiscal_year} className="bg-light-gray rounded-lg p-3 text-center">
                <div className="text-sm font-medium text-dark-gray mb-1">
                  {projection.year}
                </div>
                <div className="text-lg font-bold text-brand-blue">
                  {formatCurrency(projection.tax)}
                </div>
                {index > 0 && (
                  <div className="text-xs text-dark-gray/70 mt-1">
                    +{formatCurrency(projection.tax - projections[index - 1].tax)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
