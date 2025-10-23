import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if the request is for admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check for admin password in the URL or session
    const adminPassword = request.nextUrl.searchParams.get('admin')
    const adminSession = request.cookies.get('admin-session')
    
    // Check if admin password matches (you can change this)
    const validAdminPassword = process.env.ADMIN_PASSWORD || 'nantucket2024'
    
    if (adminPassword === validAdminPassword || adminSession?.value === 'authenticated') {
      // Set admin session cookie if password was provided
      if (adminPassword === validAdminPassword) {
        const response = NextResponse.next()
        response.cookies.set('admin-session', 'authenticated', {
          maxAge: 60 * 60 * 24, // 24 hours
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })
        return response
      }
      return NextResponse.next()
    }
    
    // Redirect to admin login page if not authenticated
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
