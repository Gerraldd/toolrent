import 'next-auth'
import { Role } from '@prisma/client'

declare module 'next-auth' {
    interface Session {
        user: {
            id: string
            nama: string
            email: string
            email: string
            role: Role
            image?: string | null
            noTelepon?: string | null
            alamat?: string | null
        }
        error?: string
        accessTokenExpires?: number
    }

    interface User {
        id: string
        nama: string
        nama: string
        email: string
        role: Role
        email: string
        role: Role
        image?: string | null
        noTelepon?: string | null
        alamat?: string | null
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string
        nama: string
        nama: string
        role: Role
        image?: string | null
        noTelepon?: string | null
        alamat?: string | null
        accessTokenExpires?: number
        refreshTokenExpires?: number
        issuedAt?: number
        error?: string
    }
}
