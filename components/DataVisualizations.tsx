'use client'

import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, DollarSign, Building } from 'lucide-react'

interface DataVisualizationsProps {
  budgetYears?: Array<{
    fiscal_year: number
    tax_rate_residential: number
    property_valuation: number
    total_revenue: number
    total_expenses: number
  }>
}

export default function DataVisualizations({ budgetYears = [] }: DataVisualizationsProps) {
  // Prepare data for charts
  const chartData = budgetYears.map(year => ({
    year: `FY${year.fiscal_year}`,
    fiscal_year: year.fiscal_year,
    taxRate: year.tax_rate_residential,
    revenue: year.total_revenue / 1000000, // Convert to millions
    expenses: year.total_expenses / 1000000, // Convert to millions
    propertyValue: year.property_valuation / 1000000000 // Convert to billions
  }))

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const firstYear = chartData[0]
  const lastYear = chartData[chartData.length - 1]

  return (
    <div className="space-y-8">
      {/* Tax Rate Forecast Chart */}
      <div className="bg-white rounded-lg shadow-brand p-6">
        <div className="flex items-center mb-6">
          <TrendingUp className="h-6 w-6 text-brand-blue mr-3" />
          <h3 className="text-2xl font-bold text-dark-gray">Tax Rate Forecast</h3>
        </div>
        
        {chartData.length > 0 ? (
          <div className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#4d4d4d' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#4d4d4d' }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value}`, 'Tax Rate per $1,000']}
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
                    dataKey="taxRate" 
                    stroke="#2e90c6" 
                    strokeWidth={3}
                    dot={{ fill: '#2e90c6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#2e90c6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {firstYear && lastYear && (
              <div className="bg-brand-blue/5 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-dark-gray mb-2">
                    Tax Rate Projection: {firstYear.year} to {lastYear.year}
                  </p>
                  <p className="text-2xl font-bold text-brand-blue">
                    ${firstYear.taxRate.toFixed(2)} → ${lastYear.taxRate.toFixed(2)}
                  </p>
                  <p className="text-sm text-dark-gray/70 mt-1">
                    {(((lastYear.taxRate - firstYear.taxRate) / firstYear.taxRate) * 100).toFixed(1)}% increase over {chartData.length} years
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-light-gray rounded-lg">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-brand-blue mx-auto mb-2" />
              <p className="text-dark-gray/70">No tax rate data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Budget Growth Chart */}
      <div className="bg-white rounded-lg shadow-brand p-6">
        <div className="flex items-center mb-6">
          <DollarSign className="h-6 w-6 text-brand-blue mr-3" />
          <h3 className="text-2xl font-bold text-dark-gray">Budget Growth Analysis</h3>
        </div>
        
        {chartData.length > 0 ? (
          <div className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#4d4d4d' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#4d4d4d' }}
                    tickFormatter={(value) => `$${value}M`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value * 1000000), 'Amount']}
                    labelFormatter={(label) => `Fiscal Year ${label}`}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #efefef',
                      borderRadius: '8px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#2e90c6"
                    fill="#2e90c6"
                    fillOpacity={0.6}
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stackId="2"
                    stroke="#4d4d4d"
                    fill="#4d4d4d"
                    fillOpacity={0.4}
                    name="Expenses"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {firstYear && lastYear && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-brand-blue/5 rounded-lg p-4">
                  <h4 className="font-semibold text-dark-gray mb-2">Revenue Growth</h4>
                  <p className="text-lg font-bold text-brand-blue">
                    {formatCurrency(firstYear.revenue * 1000000)} → {formatCurrency(lastYear.revenue * 1000000)}
                  </p>
                  <p className="text-sm text-dark-gray/70">
                    {(((lastYear.revenue - firstYear.revenue) / firstYear.revenue) * 100).toFixed(1)}% increase
                  </p>
                </div>
                <div className="bg-dark-gray/5 rounded-lg p-4">
                  <h4 className="font-semibold text-dark-gray mb-2">Expense Growth</h4>
                  <p className="text-lg font-bold text-dark-gray">
                    {formatCurrency(firstYear.expenses * 1000000)} → {formatCurrency(lastYear.expenses * 1000000)}
                  </p>
                  <p className="text-sm text-dark-gray/70">
                    {(((lastYear.expenses - firstYear.expenses) / firstYear.expenses) * 100).toFixed(1)}% increase
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-light-gray rounded-lg">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-brand-blue mx-auto mb-2" />
              <p className="text-dark-gray/70">No budget data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Property Valuation Trend */}
      <div className="bg-white rounded-lg shadow-brand p-6">
        <div className="flex items-center mb-6">
          <Building className="h-6 w-6 text-brand-blue mr-3" />
          <h3 className="text-2xl font-bold text-dark-gray">Property Valuation Trends</h3>
        </div>
        
        {chartData.length > 0 ? (
          <div className="space-y-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis 
                    dataKey="year" 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#4d4d4d' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: '#4d4d4d' }}
                    tickFormatter={(value) => `$${value}B`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value * 1000000000), 'Total Property Value']}
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
                    dataKey="propertyValue" 
                    stroke="#2e90c6" 
                    strokeWidth={3}
                    dot={{ fill: '#2e90c6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#2e90c6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {firstYear && lastYear && (
              <div className="bg-brand-blue/5 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-dark-gray mb-2">
                    Property Valuation Growth: {firstYear.year} to {lastYear.year}
                  </p>
                  <p className="text-2xl font-bold text-brand-blue">
                    {formatCurrency(firstYear.propertyValue * 1000000000)} → {formatCurrency(lastYear.propertyValue * 1000000000)}
                  </p>
                  <p className="text-sm text-dark-gray/70 mt-1">
                    {(((lastYear.propertyValue - firstYear.propertyValue) / firstYear.propertyValue) * 100).toFixed(1)}% growth over {chartData.length} years
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-light-gray rounded-lg">
            <div className="text-center">
              <Building className="h-12 w-12 text-brand-blue mx-auto mb-2" />
              <p className="text-dark-gray/70">No property valuation data available</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
