'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function UnsubscribePage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Get email from URL parameter
    const urlParams = new URLSearchParams(window.location.search)
    const emailParam = urlParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [])

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setStatus('idle')

    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage('Successfully unsubscribed. You will no longer receive updates.')
      } else {
        setStatus('error')
        setMessage(data.message || 'Unsubscription failed. Please try again.')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Unsubscribe from ACK INDEX
            </h1>
            <p className="text-xl text-gray-600">
              We're sorry to see you go! You can resubscribe anytime.
            </p>
          </div>

          <Card className="p-8">
            <form onSubmit={handleUnsubscribe} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {isLoading ? 'Unsubscribing...' : 'Unsubscribe'}
              </Button>

              {status === 'success' && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="h-5 w-5" />
                  <span>{message}</span>
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span>{message}</span>
                </div>
              )}
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200 text-center">
              <p className="text-gray-600 mb-4">
                Changed your mind? You can always resubscribe to stay informed about Nantucket projects.
              </p>
              <Button
                onClick={() => window.location.href = '/subscribe'}
                variant="outline"
                className="w-full"
              >
                Resubscribe to Updates
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
