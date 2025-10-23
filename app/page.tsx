'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function Home() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/scrape/nantucket')
      const data = await response.json()
      
      if (data.success && data.data) {
        setProjects(data.data)
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            ACK INDEX - Nantucket Project Tracker
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Stay informed about current building projects, permits, and development 
            activity in Nantucket, Massachusetts. Real-time data from official government sources.
          </p>
          
          <div className="mt-8 inline-flex items-center px-6 py-3 bg-white rounded-full shadow-lg border border-green-200">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-3"></div>
            <span className="text-green-700 font-semibold">
              {loading ? '🔄 Loading real data...' : 
               projects.length > 0 ? `✓ ${projects.length} real projects from nantucket-ma.gov` : 
               '⚠ No data available'}
            </span>
          </div>
        </div>

        {/* Statistics Cards */}
        {projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 mt-12">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">{projects.length}</p>
                  <p className="text-gray-600">Total Projects</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-green-100">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter(p => p.status === 'Active' || p.status === 'In Progress').length}
                  </p>
                  <p className="text-gray-600">Active Projects</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-red-100">
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-lg">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {projects.filter(p => p.priority === 'High').length}
                  </p>
                  <p className="text-gray-600">High Priority</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-gray-900">
                    ${projects.filter(p => p.budget && p.budget > 0).reduce((sum, p) => sum + (p.budget || 0), 0).toLocaleString()}
                  </p>
                  <p className="text-gray-600">Total Budget</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Projects Display */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Loading Real Project Data
            </h3>
            <p className="text-gray-600 text-lg">
              Scraping live data from nantucket-ma.gov...
            </p>
          </div>
        ) : projects.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3 mt-12">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {project.description}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="line-clamp-1">{project.address}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full border bg-blue-100 text-blue-800 border-blue-200">
                      {project.status}
                    </span>
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full border bg-yellow-100 text-yellow-800 border-yellow-200">
                      {project.priority} Priority
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-500">Permit #</span>
                      <span className="text-sm font-semibold text-gray-900">{project.permitNumber}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-500">Type</span>
                      <span className="text-sm text-gray-900">{project.type}</span>
                    </div>

                    {project.budget && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-500">Budget</span>
                        <span className="text-sm font-bold text-green-600 flex items-center">
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          {project.budget.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-500">Community Impact</span>
                      <span className="text-sm font-semibold text-gray-900">{project.communityImpact}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              No Projects Found
            </h3>
            <p className="text-gray-600 mb-8 text-lg">
              We're currently scraping data from nantucket-ma.gov. 
              Check back later for the latest building projects and permits.
            </p>
            <button 
              onClick={loadData}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* About Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            About This Data
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Real-Time Information</h3>
              <p className="text-gray-600 leading-relaxed">
                This dashboard scrapes live data directly from the Town of Nantucket's official 
                government website. All project information, addresses, and budgets are sourced 
                from public municipal records and updated in real-time.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Transparency & Accountability</h3>
              <p className="text-gray-600 leading-relaxed">
                Track municipal spending, monitor project progress, and stay informed about 
                development activities that impact your community. This tool promotes government 
                transparency and civic engagement.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  )
}