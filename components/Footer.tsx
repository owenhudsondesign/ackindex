import { Mail, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <span className="text-2xl font-bold font-serif tracking-wide">
                ACK INDEX
              </span>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Tracking Nantucket's municipal projects and development activity 
              with real-time data from official government sources.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-300 hover:text-white transition-colors">
                  Dashboard
                </a>
              </li>
              <li>
                <a href="/subscribe" className="text-gray-300 hover:text-white transition-colors">
                  Subscribe to Updates
                </a>
              </li>
              <li>
                <a href="/about" className="text-gray-300 hover:text-white transition-colors">
                  About This Project
                </a>
              </li>
              <li>
                <a 
                  href="https://www.nantucket-ma.gov/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Official Town Website
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <a 
                  href="mailto:hello@ackindex.com" 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  hello@ackindex.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span className="text-gray-300">Nantucket, MA</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} ACK INDEX. Data derived from Town of Nantucket public records.
            </p>
            <p className="text-gray-400 text-sm">
              Built for transparency and civic engagement
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}