import { notFound } from 'next/navigation'
import { Calendar, FileText, TrendingUp, DollarSign, Percent, Building } from 'lucide-react'

interface BudgetDetailPageProps {
  params: {
    id: string
  }
}

// Mock data for budget details
const budgetData = {
  '1': {
    id: '1',
    name: '2025 Annual Town Meeting Warrant',
    year: 2025,
    municipality: 'Nantucket, MA',
    total_budget: 117300000,
    tax_rate: 3.21,
    property_valuation: 26000000000,
    upload_date: '2024-01-15',
    description: 'Comprehensive budget document covering all municipal operations for fiscal year 2025, including detailed line items for each department and service area.'
  },
  '2': {
    id: '2',
    name: 'Forecast FY23-FY33',
    year: 2023,
    municipality: 'Nantucket, MA',
    total_budget: 123200000,
    tax_rate: 3.58,
    property_valuation: 28000000000,
    upload_date: '2024-01-10',
    description: 'Long-term budget forecast covering fiscal years 2023 through 2033, providing projections for revenue, expenses, and tax rates over the next decade.'
  },
  '3': {
    id: '3',
    name: 'Sample Budget 2023',
    year: 2023,
    municipality: 'Sample City, MA',
    total_budget: 50000000,
    tax_rate: 2.85,
    property_valuation: 15000000000,
    upload_date: '2024-01-05',
    description: 'Sample budget document demonstrating the structure and format of municipal budget reporting.'
  }
}

export default function BudgetDetailPage({ params }: BudgetDetailPageProps) {
  const budget = budgetData[params.id as keyof typeof budgetData]

  if (!budget) {
    notFound()
  }

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
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-light-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-brand p-8 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-dark-gray mb-4">
                {budget.name}
              </h1>
              <div className="flex items-center space-x-4 text-dark-gray/70">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Fiscal Year {budget.year}
                </div>
                <div className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  {budget.municipality}
                </div>
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Uploaded {formatDate(budget.upload_date)}
                </div>
              </div>
            </div>
            <div className="bg-brand-blue/10 text-brand-blue px-4 py-2 rounded-full text-lg font-semibold">
              FY{budget.year.toString().slice(-2)}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-brand p-6">
            <div className="flex items-center mb-4">
              <DollarSign className="h-8 w-8 text-brand-blue mr-3" />
              <h3 className="text-lg font-semibold text-dark-gray">Total Budget</h3>
            </div>
            <div className="text-3xl font-bold text-text-black mb-2">
              {formatCurrency(budget.total_budget)}
            </div>
            <div className="text-sm text-dark-gray/70">Annual operating budget</div>
          </div>

          <div className="bg-white rounded-lg shadow-brand p-6">
            <div className="flex items-center mb-4">
              <Percent className="h-8 w-8 text-brand-blue mr-3" />
              <h3 className="text-lg font-semibold text-dark-gray">Tax Rate</h3>
            </div>
            <div className="text-3xl font-bold text-text-black mb-2">
              ${budget.tax_rate}
            </div>
            <div className="text-sm text-dark-gray/70">Per $1,000 of assessed value</div>
          </div>

          <div className="bg-white rounded-lg shadow-brand p-6">
            <div className="flex items-center mb-4">
              <Building className="h-8 w-8 text-brand-blue mr-3" />
              <h3 className="text-lg font-semibold text-dark-gray">Property Valuation</h3>
            </div>
            <div className="text-3xl font-bold text-text-black mb-2">
              {formatCurrency(budget.property_valuation)}
            </div>
            <div className="text-sm text-dark-gray/70">Total assessed value</div>
          </div>

          <div className="bg-white rounded-lg shadow-brand p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-8 w-8 text-brand-blue mr-3" />
              <h3 className="text-lg font-semibold text-dark-gray">Budget per Capita</h3>
            </div>
            <div className="text-3xl font-bold text-text-black mb-2">
              {formatCurrency(budget.total_budget / 15000)}
            </div>
            <div className="text-sm text-dark-gray/70">Per resident (est. 15,000)</div>
          </div>
        </div>

        {/* Budget Description */}
        <div className="bg-white rounded-lg shadow-brand p-8 mb-8">
          <h2 className="text-2xl font-bold text-dark-gray mb-4">Budget Overview</h2>
          <p className="text-dark-gray/70 leading-relaxed">
            {budget.description}
          </p>
        </div>

        {/* Budget Breakdown Placeholder */}
        <div className="bg-white rounded-lg shadow-brand p-8">
          <h2 className="text-2xl font-bold text-dark-gray mb-6">Budget Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { category: 'Public Safety', amount: budget.total_budget * 0.25, color: 'bg-red-500' },
              { category: 'Education', amount: budget.total_budget * 0.35, color: 'bg-blue-500' },
              { category: 'Public Works', amount: budget.total_budget * 0.20, color: 'bg-green-500' },
              { category: 'General Government', amount: budget.total_budget * 0.15, color: 'bg-yellow-500' },
              { category: 'Health & Human Services', amount: budget.total_budget * 0.05, color: 'bg-purple-500' }
            ].map((item, index) => (
              <div key={index} className="border border-light-gray rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-dark-gray">{item.category}</h3>
                  <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                </div>
                <div className="text-2xl font-bold text-text-black mb-1">
                  {formatCurrency(item.amount)}
                </div>
                <div className="text-sm text-dark-gray/70">
                  {((item.amount / budget.total_budget) * 100).toFixed(1)}% of total budget
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
