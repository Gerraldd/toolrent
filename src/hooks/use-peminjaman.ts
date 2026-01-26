'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

// Types
export interface Peminjaman {
    id: number
    kode: string
    userId: number
    alatId: number
    jumlah: number
    tanggalPinjam: string
    tanggalKembaliRencana: string
    keperluan: string
    status: 'menunggu' | 'disetujui' | 'dipinjam' | 'ditolak' | 'dikembalikan' | 'terlambat'
    validatedBy: number | null
    validatedAt: string | null
    catatanValidasi: string | null
    createdAt: string
    updatedAt: string
    user?: {
        id: number
        nama: string
        email: string
        noTelepon: string | null
    }
    alat?: {
        id: number
        kode: string
        nama: string
        gambar: string | null
        stokTersedia: number
    }
    validator?: {
        id: number
        nama: string
    } | null
    pengembalian?: {
        id: number
        tanggalKembaliAktual: string
        hariTerlambat: number
        totalDenda: number
        kondisiAlat: string
    } | null
}

export interface CreatePeminjamanInput {
    userId?: number
    alatId: number
    jumlah?: number
    tanggalPinjam: string
    tanggalKembaliRencana: string
    keperluan: string
}

export interface UpdatePeminjamanInput {
    id?: number
    status?: string
    catatanValidasi?: string
    userId?: number
    alatId?: number
    jumlah?: number
    tanggalPinjam?: string
    tanggalKembaliRencana?: string
    keperluan?: string
}

interface PeminjamanParams {
    page?: number
    limit?: number
    search?: string
    status?: string
    userId?: string
}

interface PaginationInfo {
    page: number
    limit: number
    total: number
    totalPages: number
}

export function usePeminjaman(initialParams?: PeminjamanParams) {
    const [data, setData] = useState<Peminjaman[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState<PaginationInfo>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    })

    // Filter states
    const [searchQuery, setSearchQuery] = useState(initialParams?.search || '')
    const [statusFilter, setStatusFilter] = useState(initialParams?.status || '')
    const [currentPage, setCurrentPage] = useState(initialParams?.page || 1)

    // Operation states
    const [creating, setCreating] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [deleting, setDeleting] = useState(false)

    // Fetch data
    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const params = new URLSearchParams()
            params.append('page', currentPage.toString())
            params.append('limit', '10')
            if (searchQuery) params.append('search', searchQuery)
            if (statusFilter) params.append('status', statusFilter)

            const response = await fetch(`/api/peminjaman?${params.toString()}`)
            const result = await response.json()

            if (result.success) {
                setData(result.data)
                if (result.pagination) {
                    setPagination(result.pagination)
                }
            } else {
                setError(result.error || 'Failed to fetch data')
            }
        } catch (err) {
            setError('Network error')
            console.error('Fetch peminjaman error:', err)
        } finally {
            setLoading(false)
        }
    }, [currentPage, searchQuery, statusFilter])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Create peminjaman
    const createPeminjaman = async (input: CreatePeminjamanInput) => {
        setCreating(true)
        try {
            const response = await fetch('/api/peminjaman', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input)
            })
            const result = await response.json()

            if (result.success) {
                toast.success('Peminjaman berhasil diajukan')
                await fetchData()
                return result.data
            } else {
                toast.error(result.error || 'Gagal membuat peminjaman')
                return null
            }
        } catch (err) {
            toast.error('Network error')
            console.error('Create peminjaman error:', err)
            return null
        } finally {
            setCreating(false)
        }
    }

    // Update peminjaman (approve/reject)
    const updatePeminjaman = async (id: number, input: UpdatePeminjamanInput) => {
        setUpdating(true)
        try {
            const response = await fetch(`/api/peminjaman/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input)
            })
            const result = await response.json()

            if (result.success) {
                toast.success('Peminjaman berhasil diupdate')
                await fetchData()
                return result.data
            } else {
                toast.error(result.error || 'Gagal update peminjaman')
                return null
            }
        } catch (err) {
            toast.error('Network error')
            console.error('Update peminjaman error:', err)
            return null
        } finally {
            setUpdating(false)
        }
    }

    // Delete peminjaman
    const deletePeminjaman = async (id: number) => {
        setDeleting(true)
        try {
            const response = await fetch(`/api/peminjaman/${id}`, {
                method: 'DELETE'
            })
            const result = await response.json()

            if (result.success) {
                toast.success('Peminjaman berhasil dihapus')
                await fetchData()
                return true
            } else {
                toast.error(result.error || 'Gagal hapus peminjaman')
                return false
            }
        } catch (err) {
            toast.error('Network error')
            console.error('Delete peminjaman error:', err)
            return false
        } finally {
            setDeleting(false)
        }
    }

    return {
        // Data
        data,
        loading,
        error,
        pagination,

        // Filters
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        currentPage,
        setCurrentPage,

        // Operations
        createPeminjaman,
        updatePeminjaman,
        deletePeminjaman,
        creating,
        updating,
        deleting,

        // Refetch
        refetch: fetchData
    }
}
