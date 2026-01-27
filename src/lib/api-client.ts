/**
 * API Client for frontend-backend communication
 * Provides type-safe API functions with automatic error handling
 */

// ==========================================
// TYPES
// ==========================================

interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
    message?: string
    pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

interface FetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: unknown
    params?: Record<string, string | number | boolean | undefined>
}

// User Types
export interface User {
    id: number
    nama: string
    email: string
    role: 'admin' | 'petugas' | 'peminjam'
    noTelepon: string | null
    alamat: string | null
    image: string | null
    status: 'aktif' | 'nonaktif'
    createdAt: string
    updatedAt?: string
}

export interface CreateUserInput {
    nama: string
    email: string
    password: string
    role?: 'admin' | 'petugas' | 'peminjam'
    noTelepon?: string
    alamat?: string
    status?: 'aktif' | 'nonaktif'
    image?: string
}

export interface UpdateUserInput {
    nama?: string
    email?: string
    password?: string
    role?: 'admin' | 'petugas' | 'peminjam'
    noTelepon?: string
    alamat?: string
    status?: 'aktif' | 'nonaktif'
    image?: string
}

export interface UsersParams {
    page?: number
    limit?: number
    search?: string
    role?: string
    status?: string
}

// Alat Types
export interface Alat {
    id: number
    kode: string
    nama: string
    kategoriId: number | null
    deskripsi: string | null
    gambar: string | null
    stokTotal: number
    stokTersedia: number
    stokPerbaikan?: number
    kondisi: string
    status: 'tersedia' | 'habis' | 'maintenance'
    createdAt: string
    updatedAt?: string
    kategori?: {
        id: number
        nama: string
    } | null
}

export interface CreateAlatInput {
    kode: string
    nama: string
    kategoriId?: number
    deskripsi?: string
    gambar?: string
    stokTotal?: number
    kondisi?: string
    status?: 'tersedia' | 'habis' | 'maintenance'
}

export interface UpdateAlatInput {
    kode?: string
    nama?: string
    kategoriId?: number | null
    deskripsi?: string
    gambar?: string
    stokTotal?: number
    stokTersedia?: number
    stokPerbaikan?: number
    kondisi?: string
    status?: 'tersedia' | 'habis' | 'maintenance'
}

export interface AlatParams {
    page?: number
    limit?: number
    search?: string
    kategoriId?: string
    status?: string
}

// Kategori Types
export interface Kategori {
    id: number
    nama: string
    deskripsi: string | null
    createdAt: string
    updatedAt?: string
    _count?: {
        alat: number
    }
}

export interface CreateKategoriInput {
    nama: string
    deskripsi?: string
}

export interface UpdateKategoriInput {
    nama?: string
    deskripsi?: string
}

// ==========================================
// API CLIENT
// ==========================================

class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public data?: unknown
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

/**
 * Base fetch wrapper with error handling
 */
async function fetchApi<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<ApiResponse<T>> {
    const { method = 'GET', body, params } = options

    // Build URL with query params
    let url = endpoint
    if (params) {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                searchParams.append(key, String(value))
            }
        })
        const queryString = searchParams.toString()
        if (queryString) {
            url += `?${queryString}`
        }
    }

    const fetchOptions: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    }

    if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body)
    }

    try {
        const response = await fetch(url, fetchOptions)
        const data = await response.json()

        if (!response.ok) {
            throw new ApiError(
                data.error || 'Terjadi kesalahan',
                response.status,
                data
            )
        }

        return data as ApiResponse<T>
    } catch (error) {
        if (error instanceof ApiError) {
            throw error
        }
        throw new ApiError(
            error instanceof Error ? error.message : 'Network error',
            0
        )
    }
}

// ==========================================
// USER API
// ==========================================

export const usersApi = {
    getAll: (params?: UsersParams) =>
        fetchApi<User[]>('/api/users', { params: params as Record<string, string | number | undefined> }),

    getById: (id: number) =>
        fetchApi<User>(`/api/users/${id}`),

    create: (data: CreateUserInput) =>
        fetchApi<User>('/api/users', { method: 'POST', body: data }),

    update: (id: number, data: UpdateUserInput) =>
        fetchApi<User>(`/api/users/${id}`, { method: 'PUT', body: data }),

    delete: (id: number) =>
        fetchApi<void>(`/api/users/${id}`, { method: 'DELETE' }),
}

// ==========================================
// ALAT API
// ==========================================

export const alatApi = {
    getAll: (params?: AlatParams) =>
        fetchApi<Alat[]>('/api/alat', { params: params as Record<string, string | number | undefined> }),

    getById: (id: number) =>
        fetchApi<Alat>(`/api/alat/${id}`),

    create: (data: CreateAlatInput) =>
        fetchApi<Alat>('/api/alat', { method: 'POST', body: data }),

    update: (id: number, data: UpdateAlatInput) =>
        fetchApi<Alat>(`/api/alat/${id}`, { method: 'PUT', body: data }),

    delete: (id: number) =>
        fetchApi<void>(`/api/alat/${id}`, { method: 'DELETE' }),
}

// ==========================================
// KATEGORI API
// ==========================================

export const kategoriApi = {
    getAll: (search?: string) =>
        fetchApi<Kategori[]>('/api/kategori', { params: { search } }),

    getById: (id: number) =>
        fetchApi<Kategori>(`/api/kategori/${id}`),

    create: (data: CreateKategoriInput) =>
        fetchApi<Kategori>('/api/kategori', { method: 'POST', body: data }),

    update: (id: number, data: UpdateKategoriInput) =>
        fetchApi<Kategori>(`/api/kategori/${id}`, { method: 'PUT', body: data }),

    delete: (id: number) =>
        fetchApi<void>(`/api/kategori/${id}`, { method: 'DELETE' }),
}

// ==========================================
// PENGEMBALIAN TYPES
// ==========================================

export interface Pengembalian {
    id: number
    peminjaman: {
        id: number
        kode: string
        tanggalPinjam: string
        tanggalKembaliRencana: string
        jumlah?: number
    }
    user: {
        nama: string
        email: string
    }
    alat: {
        nama: string
        kode: string
    }
    tanggalKembali: string
    kondisi: 'baik' | 'rusak' | 'hilang'
    jumlahBaik?: number
    jumlahRusak?: number
    jumlahHilang?: number
    denda: number
    hariTerlambat: number
    keterangan: string
    status: 'selesai' | 'masalah'
}

export interface PeminjamanAktif {
    id: number
    kode: string
    jumlah: number
    tanggalPinjam: string
    tanggalKembaliRencana: string
    user: { nama: string }
    alat: { nama: string }
}

export interface CreatePengembalianInput {
    peminjamanId: number
    kondisi?: 'baik' | 'rusak' | 'hilang'
    jumlahBaik?: number
    jumlahRusak?: number
    jumlahHilang?: number
    keterangan?: string
}

export interface UpdatePengembalianInput {
    kondisi?: 'baik' | 'rusak' | 'hilang'
    keterangan?: string
    denda?: number
    jumlahBaik?: number
    jumlahRusak?: number
    jumlahHilang?: number
}

export interface PengembalianParams {
    page?: number
    limit?: number
    search?: string
    kondisi?: string
    status?: string
}

// ==========================================
// PENGEMBALIAN API
// ==========================================

export const pengembalianApi = {
    getAll: (params?: PengembalianParams) =>
        fetchApi<Pengembalian[]>('/api/pengembalian', { params: params as Record<string, string | number | undefined> }),

    getById: (id: number) =>
        fetchApi<Pengembalian>(`/api/pengembalian/${id}`),

    create: (data: CreatePengembalianInput) =>
        fetchApi<Pengembalian>('/api/pengembalian', { method: 'POST', body: data }),

    update: (id: number, data: UpdatePengembalianInput) =>
        fetchApi<Pengembalian>(`/api/pengembalian/${id}`, { method: 'PUT', body: data }),

    delete: (id: number) =>
        fetchApi<void>(`/api/pengembalian/${id}`, { method: 'DELETE' }),

    getActivePeminjaman: () =>
        fetchApi<PeminjamanAktif[]>('/api/peminjaman/aktif'),
}

// ==========================================
// LOG AKTIVITAS TYPES
// ==========================================

export interface LogAktivitas {
    id: number
    userId: number | null
    aksi: string
    tabel: string | null
    recordId: number | null
    deskripsi: string | null
    ipAddress: string | null
    createdAt: string
    user?: {
        id: number
        nama: string
        email: string
        role: string
    } | null
}

export interface LogAktivitasParams {
    page?: number
    limit?: number
    search?: string
    aksi?: string
}

// ==========================================
// LOG AKTIVITAS API
// ==========================================

export const logAktivitasApi = {
    getAll: (params?: LogAktivitasParams) =>
        fetchApi<LogAktivitas[]>('/api/log-aktivitas', { params: params as Record<string, string | number | undefined> }),

    delete: (ids: number[]) =>
        fetchApi<void>('/api/log-aktivitas', { method: 'DELETE', body: { ids } }),
}

export { ApiError }
