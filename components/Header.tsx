import Link from 'next/link'

export default function Header() {
  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl group-hover:scale-105 transition-transform duration-200">
              <div className="h-6 w-6 text-white font-bold text-lg">🏝️</div>
            </div>
            <div>
              <span className="text-2xl font-bold font-serif text-gray-900 tracking-wide">
                ACK INDEX
              </span>
              <p className="text-xs text-gray-500 -mt-1">Nantucket Project Tracker</p>
            </div>
          </Link>

              <div className="flex items-center gap-8">
                <Link
                  href="/"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-blue-50"
                >
                  Home
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-blue-50"
                >
                  Dashboard
                </Link>
                <Link
                  href="/subscribe"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-blue-50"
                >
                  Subscribe
                </Link>
                <div className="ml-4 pl-4 border-l border-gray-200">
                  <span className="text-xs text-gray-500">Live Data</span>
                </div>
              </div>
        </nav>
      </div>
    </header>
  )
}