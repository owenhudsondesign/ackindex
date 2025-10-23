import Link from 'next/link'
import { ArrowRight, TrendingUp, Calculator, FileText, DollarSign, Percent, Building } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/hero-image.jpg" 
            alt="Nantucket landscape" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/80 to-brand-blue/60"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-white">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-lg">
              Nantucket Budget Dashboard
            </h1>
            <p className="text-xl md:text-2xl opacity-90 mb-8 max-w-3xl mx-auto drop-shadow-md">
              Transparent municipal budget analysis and key financial insights
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/budgets"
                className="inline-flex items-center px-8 py-4 bg-white text-brand-blue rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Explore Budgets
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/tax-calculator"
                className="inline-flex items-center px-8 py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-brand-blue transition-colors"
              >
                <Calculator className="mr-2 h-5 w-5" />
                Tax Calculator
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-dark-gray mb-4">
              Budget Intelligence at a Glance
            </h2>
            <p className="text-lg text-dark-gray/70 max-w-2xl mx-auto">
              Comprehensive analysis of Nantucket's municipal finances with AI-powered insights
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-brand p-6 text-center">
              <div className="text-3xl font-bold text-brand-blue mb-2">6</div>
              <div className="text-dark-gray/70">Budget Documents</div>
            </div>
            <div className="bg-white rounded-lg shadow-brand p-6 text-center">
              <div className="text-3xl font-bold text-brand-blue mb-2">FY2025</div>
              <div className="text-dark-gray/70">Latest Fiscal Year</div>
            </div>
            <div className="bg-white rounded-lg shadow-brand p-6 text-center">
              <div className="text-3xl font-bold text-brand-blue mb-2">$3.21</div>
              <div className="text-dark-gray/70">Current Tax Rate per $1,000</div>
            </div>
            <div className="bg-white rounded-lg shadow-brand p-6 text-center">
              <div className="text-3xl font-bold text-brand-blue mb-2">$26B</div>
              <div className="text-dark-gray/70">Property Valuation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Budgets Section */}
      <section className="py-16 bg-light-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-dark-gray mb-4">
                Recent Budget Analysis
              </h2>
              <p className="text-lg text-dark-gray/70">
                Latest budget uploads and their key insights
              </p>
            </div>
            <Link
              href="/budgets"
              className="inline-flex items-center px-6 py-3 bg-brand-blue text-white rounded-lg font-semibold hover:bg-brand-blue/90 transition-colors"
            >
              View All Budgets
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "2025 Annual Town Meeting Warrant",
                year: 2025,
                budget: 117300000,
                taxRate: 3.21,
                uploadDate: "2024-01-15"
              },
              {
                name: "Forecast FY23-FY33",
                year: 2023,
                budget: 123200000,
                taxRate: 3.58,
                uploadDate: "2024-01-10"
              },
              {
                name: "Sample Budget 2023",
                year: 2023,
                budget: 50000000,
                taxRate: 2.85,
                uploadDate: "2024-01-05"
              }
            ].map((budget, index) => (
              <div key={index} className="bg-white rounded-lg shadow-brand hover:shadow-brand-lg transition-all duration-300 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-dark-gray">{budget.name}</h3>
                  <div className="bg-brand-blue/10 text-brand-blue px-2 py-1 rounded-full text-xs font-medium">
                    FY{budget.year.toString().slice(-2)}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-dark-gray/70">Total Budget</span>
                    <span className="font-semibold text-text-black">
                      ${(budget.budget / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-dark-gray/70">Tax Rate</span>
                    <span className="text-sm text-dark-gray">${budget.taxRate} per $1,000</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-dark-gray/70">Upload Date</span>
                    <span className="text-sm text-dark-gray">{budget.uploadDate}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-light-gray">
                  <Link
                    href={`/budgets/${index + 1}`}
                    className="inline-flex items-center px-4 py-2 bg-brand-blue text-white rounded-md hover:bg-brand-blue/90 transition-colors text-sm font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-dark-gray mb-4">
              Powerful Features
            </h2>
            <p className="text-lg text-dark-gray/70 max-w-2xl mx-auto">
              Everything you need to understand municipal finances
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: TrendingUp,
                title: 'AI-Powered Analysis',
                description: 'Advanced algorithms analyze budget patterns and predict trends'
              },
              {
                icon: Calculator,
                title: 'Tax Calculator',
                description: 'Calculate your property taxes based on current budget data'
              },
              {
                icon: FileText,
                title: 'Detailed Reports',
                description: 'Comprehensive breakdowns of municipal spending and revenue'
              }
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-blue/10 rounded-full mb-4">
                  <feature.icon className="h-8 w-8 text-brand-blue" />
                </div>
                <h3 className="text-xl font-semibold text-dark-gray mb-2">
                  {feature.title}
                </h3>
                <p className="text-dark-gray/70">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}