import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow access to student profile pages
  if (pathname.startsWith('/students/') && pathname !== '/students') {
    // Set a cookie to track that user accessed via student profile link
    const response = NextResponse.next()
    response.cookies.set('access_type', 'student_profile', {
      httpOnly: false, // Allow client-side access
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    })
    return response
  }
  
  // Allow admin login page
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }
  
  // Allow API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  // Block dashboard access if user came from student profile link
  if (pathname === '/') {
    const accessType = request.cookies.get('access_type')?.value
    const adminSession = request.cookies.get('admin_session')?.value
    const adminToken = request.nextUrl.searchParams.get('admin')
    const validAdminToken = process.env.ADMIN_TOKEN
    
    // If admin token is provided in URL, verify and set session
    if (adminToken && validAdminToken && adminToken === validAdminToken) {
      const response = NextResponse.next()
      response.cookies.set('admin_session', 'authenticated', {
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      // Clear student profile access flag
      response.cookies.set('access_type', '', {
        maxAge: 0,
      })
      return response
    }
    
    // If user accessed via student profile, block dashboard
    if (accessType === 'student_profile' && !adminSession) {
      // Redirect to access denied page
      return NextResponse.redirect(new URL('/access-denied', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

