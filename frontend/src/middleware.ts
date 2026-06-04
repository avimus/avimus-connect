import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('avimus_token')?.value
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/activate')
  const isAdminRoute = pathname.startsWith('/admin')
  const isClientRoute = pathname.startsWith('/client')

  if (isAuthRoute) return NextResponse.next()

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid JWT')
    // JWT usa base64url: converte para base64 padrão antes de atob
    const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, '=')
    const payload = JSON.parse(atob(padded)) as { role: string; exp: number }

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isAdminRoute && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/client/instances', request.url))
    }
    if (isClientRoute && payload.role !== 'client') {
      return NextResponse.redirect(new URL('/admin/clients', request.url))
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/client/:path*', '/login', '/activate/:path*'],
}
