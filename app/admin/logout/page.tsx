'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogoutPage() {
  const router = useRouter()

  useEffect(() => {
    // Clear admin session cookie
    document.cookie = 'admin-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    
    // Redirect to dashboard
    router.push('/')
  }, [router])

  return (
    <div className="min-h-screen bg-light-gray flex items-center justify-center">
      <div className="text-center">
        <div className="bg-white rounded-lg shadow-brand p-8">
          <h1 className="text-xl font-semibold text-dark-gray mb-4">Logging out...</h1>
          <p className="text-dark-gray/70">Redirecting to dashboard</p>
        </div>
      </div>
    </div>
  )
}
