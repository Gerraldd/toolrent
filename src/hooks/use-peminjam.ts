import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface Alat {
    id: number
    kode: string
    nama: string
    gambar?: string
    stokTersedia: number
}

interface Peminjaman {
    id: number
    kode: string
    userId: number
    alatId: number
    jumlah: number
    tanggalPinjam: string
    tanggalKembaliRencana: string
    keperluan: string
    status: string
    createdAt: string
    user?: {
        id: number
        nama: string
        email: string
    }
    alat?: Alat
}

interface ActiveLoan {
    id: number
    kode: string
    alat: Alat
    tanggalPinjam: string
    tanggalKembaliRencana: string
    jumlah: number
    keperluan: string
    status: string
}

interface Pengembalian {
    id: number
    peminjaman: {
        id: number
        kode: string
        tanggalPinjam: string
        tanggalKembaliRencana: string
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
    kondisi: string
    denda: number
    hariTerlambat: number
    keterangan: string
    status: string
}

interface Pagination {
    page: number
    limit: number
    total: number
    totalPages: number
}

// Hook for fetching borrower's loans
export function useMyLoans() {
    const [data, setData] = useState<Peminjaman[]>([])
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchMyLoans = useCallback(async (params?: {
        page?: number
        limit?: number
        search?: string
        status?: string
    }) => {
        setLoading(true)
        setError(null)
        try {
            const query = new URLSearchParams()
            if (params?.page) query.set('page', params.page.toString())
            if (params?.limit) query.set('limit', params.limit.toString())
            if (params?.search) query.set('search', params.search)
            if (params?.status) query.set('status', params.status)

            const res = await fetch(`/api/peminjaman?${query.toString()}`)
            const result = await res.json()

            if (result.success) {
                setData(result.data)
                setPagination(result.pagination)
            } else {
                setError(result.error || 'Gagal memuat data')
            }
        } catch (err) {
            setError('Terjadi kesalahan jaringan')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    return { data, pagination, loading, error, fetchMyLoans }
}

// Hook for fetching active loans (for return form)
export function useMyActiveLoans() {
    const [data, setData] = useState<ActiveLoan[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchActiveLoans = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/peminjam/my-active-loans')
            const result = await res.json()

            if (result.success) {
                setData(result.data)
            } else {
                setError(result.error || 'Gagal memuat data')
            }
        } catch (err) {
            setError('Terjadi kesalahan jaringan')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    return { data, loading, error, fetchActiveLoans }
}

// Hook for fetching borrower's returns
export function useMyReturns() {
    const [data, setData] = useState<Pengembalian[]>([])
    const [pagination, setPagination] = useState<Pagination | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchMyReturns = useCallback(async (params?: {
        page?: number
        limit?: number
        search?: string
        kondisi?: string
        status?: string
    }) => {
        setLoading(true)
        setError(null)
        try {
            const query = new URLSearchParams()
            if (params?.page) query.set('page', params.page.toString())
            if (params?.limit) query.set('limit', params.limit.toString())
            if (params?.search) query.set('search', params.search)
            if (params?.kondisi) query.set('kondisi', params.kondisi)
            if (params?.status) query.set('status', params.status)

            const res = await fetch(`/api/pengembalian?${query.toString()}`)
            const result = await res.json()

            if (result.success) {
                setData(result.data)
                setPagination(result.pagination)
            } else {
                setError(result.error || 'Gagal memuat data')
            }
        } catch (err) {
            setError('Terjadi kesalahan jaringan')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    return { data, pagination, loading, error, fetchMyReturns }
}

// Hook for creating a new loan request
export function useCreateLoan() {
    const [loading, setLoading] = useState(false)

    const createLoan = useCallback(async (payload: {
        alatId: number
        tanggalPinjam: string
        tanggalKembaliRencana: string
        jumlah: number
        keperluan: string
    }) => {
        setLoading(true)
        try {
            const res = await fetch('/api/peminjaman', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const result = await res.json()

            if (result.success) {
                toast.success('Peminjaman berhasil diajukan!')
                return { success: true, data: result.data }
            } else {
                toast.error(result.error || 'Gagal mengajukan peminjaman')
                return { success: false, error: result.error }
            }
        } catch (err) {
            toast.error('Terjadi kesalahan jaringan')
            console.error(err)
            return { success: false, error: 'Network error' }
        } finally {
            setLoading(false)
        }
    }, [])

    return { createLoan, loading }
}

// Hook for fetching alat list (for tool selection)
export function useAlatList() {
    const [data, setData] = useState<Alat[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchAlat = useCallback(async (params?: {
        search?: string
        kategoriId?: number
        status?: string
        limit?: number
    }) => {
        setLoading(true)
        setError(null)
        try {
            const query = new URLSearchParams()
            if (params?.search) query.set('search', params.search)
            if (params?.kategoriId) query.set('kategoriId', params.kategoriId.toString())
            if (params?.status) query.set('status', params.status)
            query.set('limit', (params?.limit || 100).toString())

            const res = await fetch(`/api/alat?${query.toString()}`)
            const result = await res.json()

            if (result.success) {
                setData(result.data)
            } else {
                setError(result.error || 'Gagal memuat data')
            }
        } catch (err) {
            setError('Terjadi kesalahan jaringan')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    return { data, loading, error, fetchAlat }
}
