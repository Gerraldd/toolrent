import { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

// Token expiry configurations
const ACCESS_TOKEN_EXPIRY = 15 * 60 // 15 minutes in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 // 7 days in seconds

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                try {
                    if (!credentials?.email || !credentials?.password) {
                        throw new Error('Email dan password harus diisi')
                    }

                    const user = await prisma.user.findUnique({
                        where: { email: credentials.email },
                    })

                    if (!user) {
                        throw new Error('Email atau password salah')
                    }

                    if (user.status === 'nonaktif') {
                        throw new Error('Akun Anda telah dinonaktifkan')
                    }

                    const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

                    if (!isPasswordValid) {
                        throw new Error('Email atau password salah')
                    }

                    // Log aktivitas login
                    try {
                        await prisma.logAktivitas.create({
                            data: {
                                userId: user.id,
                                aksi: 'LOGIN',
                                tabel: 'users',
                                recordId: user.id,
                                deskripsi: `${user.nama} berhasil login`,
                            },
                        })
                    } catch (logError) {
                        console.error('Failed to log login activity:', logError)
                        // Don't block login if logging fails
                    }

                    return {
                        id: String(user.id),
                        nama: user.nama,
                        email: user.email,
                        role: user.role,
                        image: user.image,
                        noTelepon: user.noTelepon,
                        alamat: user.alamat,
                    }
                } catch (error) {
                    console.error('Auth error:', error)
                    // Ensure we return null or throw a simple error string, not undefined
                    throw new Error(error instanceof Error ? error.message : 'Authentication failed')
                }
            },
        }),
    ],
    session: {
        strategy: 'jwt',
        maxAge: REFRESH_TOKEN_EXPIRY, // Session max age matches refresh token expiry
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    callbacks: {
        async jwt({ token, user, trigger }) {
            try {
                const now = Math.floor(Date.now() / 1000)

                // Initial sign in
                if (user) {
                    return {
                        ...token,
                        id: user.id,
                        nama: user.nama,
                        role: user.role,
                        image: user.image,
                        noTelepon: user.noTelepon,
                        alamat: user.alamat,
                        accessTokenExpires: now + ACCESS_TOKEN_EXPIRY,
                        refreshTokenExpires: now + REFRESH_TOKEN_EXPIRY,
                        issuedAt: now,
                    }
                }

                // Handle session update trigger - fetch fresh data from DB
                if (trigger === 'update') {
                    const userId = parseInt(token.id as string)
                    if (!isNaN(userId)) {
                        const freshUser = await prisma.user.findUnique({
                            where: { id: userId },
                            select: { id: true, nama: true, email: true, role: true, image: true, noTelepon: true, alamat: true }
                        })
                        if (freshUser) {
                            return {
                                ...token,
                                nama: freshUser.nama,
                                role: freshUser.role,
                                image: freshUser.image,
                                noTelepon: freshUser.noTelepon,
                                alamat: freshUser.alamat,
                            }
                        }
                    }
                }

                // Return previous token if the access token has not expired yet
                if (token.accessTokenExpires && now < (token.accessTokenExpires as number)) {
                    return token
                }

                // Access token has expired, check if we can refresh
                if (token.refreshTokenExpires && now < (token.refreshTokenExpires as number)) {
                    // Refresh the access token
                    // console.log('Access token expired, refreshing...')

                    // Verify user still exists and is active
                    const userId = parseInt(token.id as string)
                    if (!isNaN(userId)) {
                        try {
                            const user = await prisma.user.findUnique({
                                where: { id: userId },
                                select: { id: true, status: true, nama: true, role: true, image: true, noTelepon: true, alamat: true }
                            })

                            if (!user || user.status === 'nonaktif') {
                                // User no longer valid, force re-login
                                console.log('User no longer valid, forcing re-login')
                                return {
                                    ...token,
                                    error: 'RefreshAccessTokenError',
                                }
                            }

                            // Return refreshed token
                            return {
                                ...token,
                                nama: user.nama,
                                role: user.role,
                                image: user.image,
                                noTelepon: user.noTelepon,
                                alamat: user.alamat,
                                accessTokenExpires: now + ACCESS_TOKEN_EXPIRY,
                                issuedAt: now,
                            }
                        } catch (dbError) {
                            console.error('Database error during token refresh:', dbError)
                            // return token with error to force re-login or handle gracefully
                            return {
                                ...token,
                                error: 'RefreshAccessTokenError',
                            }
                        }
                    }
                }

                // Refresh token has also expired
                // console.log('Refresh token expired, user must re-login')
                return {
                    ...token,
                    error: 'RefreshTokenExpired',
                }
            } catch (error) {
                console.error('JWT callback error:', error)
                return {
                    ...token,
                    error: 'TokenError',
                }
            }
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id as string
                session.user.nama = token.nama as string
                session.user.role = token.role
                session.user.image = token.image as string | null | undefined
                session.user.noTelepon = token.noTelepon as string | null | undefined
                session.user.alamat = token.alamat as string | null | undefined

                // Add token status to session for frontend handling
                if (token.error) {
                    session.error = token.error as string
                }

                // Add token expiry info for frontend
                session.accessTokenExpires = token.accessTokenExpires as number
            }
            return session
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
}
