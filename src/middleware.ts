import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Skip middleware for static files and API routes
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') // static files
    ) {
        return NextResponse.next()
    }

    // Get token from session
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    })

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/']
    if (publicRoutes.includes(pathname)) {
        // If already logged in, redirect to appropriate dashboard
        if (token) {
            const role = token.role as string
            switch (role) {
                case 'admin':
                    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
                case 'petugas':
                    return NextResponse.redirect(new URL('/petugas/dashboard', request.url))
                case 'peminjam':
                    return NextResponse.redirect(new URL('/peminjam/beranda', request.url))
            }
        }
        return NextResponse.next()
    }

    // Protected routes - require authentication
    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    const role = token.role as string

    // Role-based route protection
    if (pathname.startsWith('/admin')) {
        // Only admin can access admin routes
        if (role !== 'admin') {
            // Redirect to their appropriate dashboard
            switch (role) {
                case 'petugas':
                    return NextResponse.redirect(new URL('/petugas/dashboard', request.url))
                case 'peminjam':
                    return NextResponse.redirect(new URL('/peminjam/beranda', request.url))
                default:
                    return NextResponse.redirect(new URL('/login', request.url))
            }
        }
    }

    if (pathname.startsWith('/petugas')) {
        // Only admin and petugas can access petugas routes
        if (!['admin', 'petugas'].includes(role)) {
            switch (role) {
                case 'peminjam':
                    return NextResponse.redirect(new URL('/peminjam/beranda', request.url))
                default:
                    return NextResponse.redirect(new URL('/login', request.url))
            }
        }
    }

    if (pathname.startsWith('/peminjam')) {
        // All authenticated users can access peminjam routes
        // (peminjam, petugas, admin)
        if (!['admin', 'petugas', 'peminjam'].includes(role)) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
    ],
}
