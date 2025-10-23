import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ack Index - Nantucket\'s Civic Intelligence Platform',
  description: 'AI-powered budget analysis and tax projections for Nantucket',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-light-gray">
          <Header />
          <main>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
