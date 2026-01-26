import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import jwt from 'jsonwebtoken'
import { authOptions } from '@/lib/auth'

interface TokenPayload {
    id: string
    nama: string
    email: string
    role: string
    type: string
    iat: number
    exp: number
}

export interface AuthUser {
    id: string
    nama: string
    email: string
    role: string
}

export interface AuthResult {
    authenticated: boolean
    user: AuthUser | null
    error?: string
}

/**
 * Verify authentication from either:
 * 1. NextAuth session (for browser requests)
 * 2. Bearer token in Authorization header (for API/Postman requests)
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
    // First, try to get NextAuth session
    const session = await getServerSession(authOptions)

    if (session && session.user) {
        return {
            authenticated: true,
            user: {
                id: session.user.id,
                nama: session.user.nama,
                email: session.user.email,
                role: session.user.role as string
            }
        }
    }

    // If no session, try Bearer token from Authorization header
    const authHeader = request.headers.get('authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            authenticated: false,
            user: null,
            error: 'Token tidak ditemukan. Gunakan Bearer token di header Authorization.'
        }
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const secret = process.env.NEXTAUTH_SECRET || 'default-secret'

    try {
        const decoded = jwt.verify(token, secret) as TokenPayload

        // Check if it's an access token
        if (decoded.type !== 'access') {
            return {
                authenticated: false,
                user: null,
                error: 'Token yang diberikan bukan access token'
            }
        }

        return {
            authenticated: true,
            user: {
                id: decoded.id,
                nama: decoded.nama,
                email: decoded.email,
                role: decoded.role
            }
        }
    } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
            return {
                authenticated: false,
                user: null,
                error: 'Access token telah kadaluarsa. Gunakan refresh token untuk mendapatkan token baru.'
            }
        }

        return {
            authenticated: false,
            user: null,
            error: 'Token tidak valid'
        }
    }
}

/**
 * Check if user has specific role(s)
 */
export function hasRole(user: AuthUser, roles: string | string[]): boolean {
    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    return allowedRoles.includes(user.role)
}
