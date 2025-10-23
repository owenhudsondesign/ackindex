'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface BudgetChartsProps {
  budgetData: {
    categories: Array<{
      name: string
      amount: number
      percentage: number
    }>
    taxRates: Array<{
      year: string
      rate: number
    }>
  }
}

export default function BudgetCharts({ budgetData }: BudgetChartsProps) {
  const [activeTab, setActiveTab] = useState('breakdown')

  const tabs = [
    { id: 'breakdown', label: 'Budget Breakdown' },
    { id: 'tax-rates', label: 'Tax Rates' },
    { id: 'revenue-expenses', label: 'Revenue vs Expenses' }
  ]

  const COLORS = ['#2e90c6', '#4d4d4d', '#efefef', '#191919', '#2e90c6']

  const mockRevenueExpenses = [
    { category: 'Property Tax', revenue: 85000000, expenses: 0 },
    { category: 'State Aid', revenue: 15000000, expenses: 0 },
    { category: 'Other Revenue', revenue: 12000000, expenses: 0 },
    { category: 'Education', revenue: 0, expenses: 55000000 },
    { category: 'Public Safety', revenue: 0, expenses: 25000000 },
    { category: 'Public Works', revenue: 0, expenses: 18000000 },
    { category: 'General Government', revenue: 0, expenses: 15000000 }
  ]

  return (
    <div className="bg-white rounded-lg shadow-brand p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-dark-gray mb-4">Budget Analysis</h3>
        
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-light-gray p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-blue text-white'
                  : 'text-dark-gray hover:text-brand-blue'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Content */}
      <div className="h-96">
        {activeTab === 'breakdown' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgetData.categories}>
              <CartesianGrid strokeDasharray="3 3" stroke="#efefef" />
              <XAxis 
                dataKey="name" 
                stroke="#4d4d4d"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                stroke="#4d4d4d"
                fontSize={12}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #efefef',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  'Amount'
                ]}
              />
              <Bar dataKey="amount" fill="#2e90c6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'tax-rates' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={budgetData.taxRates}>
              <CartesianGrid strokeDasharray="3 3" stroke="#efefef" />
              <XAxis 
                dataKey="year" 
                stroke="#4d4d4d"
                fontSize={12}
              />
              <YAxis 
                stroke="#4d4d4d"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #efefef',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
                formatter={(value: number) => [
                  `${value}%`,
                  'Tax Rate'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#2e90c6" 
                strokeWidth={3}
                dot={{ fill: '#2e90c6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeTab === 'revenue-expenses' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockRevenueExpenses} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#efefef" />
              <XAxis 
                type="number"
                stroke="#4d4d4d"
                fontSize={12}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
              />
              <YAxis 
                type="category"
                dataKey="category"
                stroke="#4d4d4d"
                fontSize={12}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #efefef',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  'Amount'
                ]}
              />
              <Bar dataKey="revenue" fill="#2e90c6" name="Revenue" />
              <Bar dataKey="expenses" fill="#4d4d4d" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
