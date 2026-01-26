// Types for the application

import { Role, UserStatus, AlatStatus, PeminjamanStatus, KondisiAlat } from '@prisma/client'

export type { Role, UserStatus, AlatStatus, PeminjamanStatus, KondisiAlat }

// User type for session
export interface SessionUser {
    id: string
    nama: string
    email: string
    role: Role
}

// Extended session
export interface ExtendedSession {
    user: SessionUser
    expires: string
}

// API Response types
export interface ApiResponse<T = unknown> {
    success: boolean
    message?: string
    data?: T
    error?: string
}

// Pagination
export interface PaginationParams {
    page?: number
    limit?: number
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
    data: T[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

// Form types
export interface LoginFormData {
    email: string
    password: string
}

export interface UserFormData {
    nama: string
    email: string
    password?: string
    role: Role
    noTelepon?: string
    alamat?: string
    status?: UserStatus
}

export interface AlatFormData {
    kode: string
    nama: string
    kategoriId?: number
    deskripsi?: string
    gambar?: string
    stokTotal: number
    kondisi?: string
    status?: AlatStatus
}

export interface PeminjamanFormData {
    alatId: number
    jumlah: number
    tanggalPinjam: Date
    tanggalKembaliRencana: Date
    keperluan: string
}

export interface PengembalianFormData {
    peminjamanId: number
    kondisiAlat: KondisiAlat
    catatan?: string
}

// Status labels with Indonesian translation
export const STATUS_LABELS = {
    peminjaman: {
        menunggu: 'Menunggu Persetujuan',
        disetujui: 'Disetujui',
        dipinjam: 'Sedang Dipinjam',
        ditolak: 'Ditolak',
        dikembalikan: 'Dikembalikan',
        terlambat: 'Terlambat',
    },
    user: {
        aktif: 'Aktif',
        nonaktif: 'Nonaktif',
    },
    alat: {
        tersedia: 'Tersedia',
        habis: 'Habis',
        maintenance: 'Maintenance',
    },
    kondisi: {
        baik: 'Baik',
        rusak_ringan: 'Rusak Ringan',
        rusak_berat: 'Rusak Berat',
        hilang: 'Hilang',
    },
} as const

// Role labels
export const ROLE_LABELS = {
    admin: 'Administrator',
    petugas: 'Petugas',
    peminjam: 'Peminjam',
} as const

// Status colors for badges
export const STATUS_COLORS = {
    peminjaman: {
        menunggu: 'bg-yellow-100 text-yellow-800',
        disetujui: 'bg-green-100 text-green-800',
        dipinjam: 'bg-blue-100 text-blue-800',
        ditolak: 'bg-red-100 text-red-800',
        dikembalikan: 'bg-gray-100 text-gray-800',
        terlambat: 'bg-red-100 text-red-800',
    },
    user: {
        aktif: 'bg-green-100 text-green-800',
        nonaktif: 'bg-red-100 text-red-800',
    },
    alat: {
        tersedia: 'bg-green-100 text-green-800',
        habis: 'bg-red-100 text-red-800',
        maintenance: 'bg-yellow-100 text-yellow-800',
    },
} as const
