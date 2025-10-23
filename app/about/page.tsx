export default function AboutPage() {
  return (
    <div className="min-h-screen bg-light-gray">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-brand p-8">
          <h1 className="text-4xl md:text-5xl font-bold text-dark-gray mb-8">About Nantucket Budget Dashboard</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-dark-gray/70 mb-6">
              The Nantucket Budget Dashboard provides transparent access to municipal budget information 
              and financial insights for the Town of Nantucket, Massachusetts.
            </p>
            
            <h2 className="text-2xl font-semibold text-dark-gray mb-4">Our Mission</h2>
            <p className="text-dark-gray/70 mb-6">
              To provide residents, businesses, and stakeholders with clear, accessible information 
              about how Nantucket allocates its financial resources and manages municipal services.
            </p>
            
            <h2 className="text-2xl font-semibold text-dark-gray mb-4">What We Provide</h2>
            <ul className="list-disc list-inside text-dark-gray/70 mb-6 space-y-2">
              <li>Comprehensive budget overviews and key financial metrics</li>
              <li>Interactive tax calculator for property tax estimates</li>
              <li>Historical budget data and trend analysis</li>
              <li>Transparent breakdown of municipal spending</li>
            </ul>
            
            <h2 className="text-2xl font-semibold text-dark-gray mb-4">Data Sources</h2>
            <p className="text-dark-gray/70 mb-6">
              All budget data is sourced from official Nantucket municipal budget documents 
              and is updated regularly to ensure accuracy and timeliness.
            </p>
            
            <h2 className="text-2xl font-semibold text-dark-gray mb-4">Contact</h2>
            <p className="text-dark-gray/70">
              For questions about budget data or municipal finances, please contact the 
              Nantucket Town Hall or visit the official Town of Nantucket website.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
