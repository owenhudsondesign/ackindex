import { Info, TrendingUp } from 'lucide-react'

export default function TaxCalculatorPage() {
  return (
    <div className="min-h-screen bg-light-gray">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-dark-gray mb-4">
            Property Tax Calculator
          </h1>
          <p className="text-lg text-dark-gray/70 max-w-2xl mx-auto">
            Calculate your Nantucket property taxes based on the latest municipal budget data
          </p>
        </div>

        {/* Tax Calculator */}
        <div className="bg-white rounded-lg shadow-brand p-8 mb-12">
          <div className="flex items-center mb-6">
            <div className="h-8 w-8 bg-brand-blue/10 rounded-full flex items-center justify-center mr-3">
              <span className="text-brand-blue font-bold">$</span>
            </div>
            <h2 className="text-2xl font-bold text-dark-gray">Calculate Your Property Taxes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Input Section */}
            <div>
              <label className="block text-sm font-medium text-dark-gray mb-2">
                Your Property Value
              </label>
              <input
                type="number"
                placeholder="e.g., 2,000,000"
                className="w-full p-4 border border-light-gray rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-transparent text-text-black text-lg"
              />
              <p className="text-xs text-dark-gray/70 mt-2">
                Current average property value: $1,200,000
              </p>
            </div>

            {/* Results Section */}
            <div>
              <div className="bg-brand-blue/5 p-6 rounded-lg">
                <p className="text-sm text-dark-gray/70 mb-1">Projected Annual Tax (FY2025)</p>
                <p className="text-3xl font-bold text-text-black">$6,420</p>
                <p className="text-xs text-dark-gray/70 mt-2">
                  Based on current tax rate of <span className="font-semibold text-brand-blue">$3.21 per $1,000</span>
                </p>
              </div>
            </div>
          </div>

          {/* Tax Projections */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-dark-gray mb-4">10-Year Tax Projections</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { year: '2025', tax: 6420, change: '+$0' },
                { year: '2026', tax: 6720, change: '+$300' },
                { year: '2027', tax: 7020, change: '+$300' },
                { year: '2028', tax: 7320, change: '+$300' },
                { year: '2029', tax: 7620, change: '+$300' },
                { year: '2030', tax: 7920, change: '+$300' },
                { year: '2031', tax: 8220, change: '+$300' },
                { year: '2032', tax: 8520, change: '+$300' },
                { year: '2033', tax: 8820, change: '+$300' },
                { year: '2034', tax: 9120, change: '+$300' }
              ].map((projection) => (
                <div key={projection.year} className="bg-light-gray rounded-lg p-3 text-center">
                  <div className="text-sm font-medium text-dark-gray mb-1">FY{projection.year}</div>
                  <div className="text-lg font-bold text-brand-blue">${projection.tax.toLocaleString()}</div>
                  <div className="text-xs text-green-600">{projection.change}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-brand p-6">
            <div className="flex items-center mb-4">
              <Info className="h-6 w-6 text-brand-blue mr-2" />
              <h3 className="text-lg font-semibold text-dark-gray">How It Works</h3>
            </div>
            <div className="space-y-3 text-sm text-dark-gray/70">
              <p>
                Our calculator uses the most recent tax rate from Nantucket's municipal budget.
              </p>
              <p>
                The current rate of $3.21 per $1,000 is based on the FY2025 budget analysis.
              </p>
              <p>
                Property taxes fund essential services including schools, public safety, and infrastructure.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-brand p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-6 w-6 text-brand-blue mr-2" />
              <h3 className="text-lg font-semibold text-dark-gray">Tax Trends</h3>
            </div>
            <div className="space-y-3 text-sm text-dark-gray/70">
              <p>
                Nantucket's tax rate has remained relatively stable over the past 5 years.
              </p>
              <p>
                Property values have increased by an average of 8% annually.
              </p>
              <p>
                The town maintains a strong fiscal position with balanced budgets.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-sm text-yellow-800">
            <strong>Disclaimer:</strong> This calculator provides estimates based on current budget data. 
            Actual tax bills may vary based on property assessments, exemptions, and other factors. 
            Please consult with the Nantucket Assessor's Office for official tax information.
          </div>
        </div>
      </div>
    </div>
  )
}
