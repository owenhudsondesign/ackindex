import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

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
          <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
            <div className="container-custom py-4">
              <div className="flex items-center justify-between">
                <a href="/" className="flex items-center space-x-3">
                  <div className="text-3xl">🏛️</div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">AckIndex</h1>
                    <p className="text-xs text-gray-600">Nantucket Civic Intelligence</p>
                  </div>
                </a>
                <a
                  href="/admin"
                  className="px-4 py-2 text-sm font-semibold text-ack-blue hover:text-ack-blue/80 transition-colors"
                >
                  Admin
                </a>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 mt-20">
            <div className="container-custom py-8">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  An Independent Civic Project for Nantucket, Massachusetts
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Making local government data accessible and transparent
                </p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
