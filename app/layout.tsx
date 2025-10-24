import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AckIndex - Nantucket Civic Intelligence Dashboard',
  description: 'A transparent, data-driven view of civic updates from Nantucket, Massachusetts',
  keywords: 'Nantucket, civic data, town government, budget, real estate, infrastructure',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          {/* Navigation */}
          <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95 shadow-sm">
            <div className="container-custom py-4">
              <div className="flex items-center justify-between">
                <a href="/" className="flex items-center gap-3 group">
                  <div className="text-4xl transform group-hover:scale-110 transition-transform">
                    🏛️
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 group-hover:text-ack-blue transition">
                      AckIndex
                    </h1>
                    <p className="text-xs text-gray-600 -mt-0.5">
                      Nantucket Civic Intelligence
                    </p>
                  </div>
                </a>
                
                <div className="flex items-center gap-4">
                  <a
                    href="/admin"
                    className="px-4 py-2 text-sm font-semibold text-ack-blue hover:bg-ack-blue/10 rounded-lg transition-all"
                  >
                    Admin Portal
                  </a>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-20">
            <div className="container-custom py-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                {/* About */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-3xl">🏛️</span>
                    <h3 className="text-lg font-bold text-gray-900">AckIndex</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Making Nantucket's civic data accessible and understandable 
                    through AI-powered analysis.
                  </p>
                </div>

                {/* Quick Links */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Quick Links</h4>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <a href="/" className="text-gray-600 hover:text-ack-blue transition">
                        Dashboard
                      </a>
                    </li>
                    <li>
                      <a href="/admin" className="text-gray-600 hover:text-ack-blue transition">
                        Admin Portal
                      </a>
                    </li>
                  </ul>
                </div>

                {/* Contact */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">About This Project</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    An independent civic technology project for transparent, 
                    accessible government data.
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 text-center">
                <p className="text-sm text-gray-600">
                  © {new Date().getFullYear()} AckIndex • Built for Nantucket, Massachusetts
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Data sourced from official town documents • Powered by AI
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
