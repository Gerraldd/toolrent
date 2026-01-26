'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    pengembalianApi,
    Pengembalian,
    PeminjamanAktif,
    CreatePengembalianInput,
    UpdatePengembalianInput,
    PengembalianParams,
    ApiError
} from '@/lib/api-client'
import { toast } from 'sonner'

interface UsePengembalianResult {
    data: Pengembalian[]
    loading: boolean
    error: string | null
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
    refetch: () => Promise<void>
    setPage: (page: number) => void
    setSearch: (search: string) => void
    setKondisiFilter: (kondisi: string) => void
    setStatusFilter: (status: string) => void
}

interface UsePengembalianMutationResult {
    loading: boolean
    error: string | null
}

interface UseCreatePengembalianResult extends UsePengembalianMutationResult {
    createPengembalian: (data: CreatePengembalianInput) => Promise<Pengembalian | null>
}

interface UseUpdatePengembalianResult extends UsePengembalianMutationResult {
    updatePengembalian: (id: number, data: UpdatePengembalianInput) => Promise<Pengembalian | null>
}

interface UseDeletePengembalianResult extends UsePengembalianMutationResult {
    deletePengembalian: (id: number) => Promise<boolean>
}

interface UsePeminjamanAktifResult {
    data: PeminjamanAktif[]
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
}

/**
 * Hook to fetch pengembalian with pagination and filtering
 */
export function usePengembalian(initialParams?: PengembalianParams): UsePengembalianResult {
    const [data, setData] = useState<Pengembalian[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState({
        page: initialParams?.page || 1,
        limit: initialParams?.limit || 10,
        total: 0,
        totalPages: 0,
    })
    const [params, setParams] = useState<PengembalianParams>(initialParams || {})

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await pengembalianApi.getAll({
                ...params,
                page: pagination.page,
                limit: pagination.limit,
            })

            if (response.success && response.data) {
                setData(response.data)
                if (response.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        ...response.pagination,
                    }))
                }
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal memuat data pengembalian'
            setError(message)
            console.error('Error fetching pengembalian:', err)
        } finally {
            setLoading(false)
        }
    }, [params, pagination.page, pagination.limit])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const setPage = useCallback((page: number) => {
        setPagination(prev => ({ ...prev, page }))
    }, [])

    const setSearch = useCallback((search: string) => {
        setParams(prev => ({ ...prev, search }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }, [])

    const setKondisiFilter = useCallback((kondisi: string) => {
        setParams(prev => ({ ...prev, kondisi }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }, [])

    const setStatusFilter = useCallback((status: string) => {
        setParams(prev => ({ ...prev, status }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }, [])

    return {
        data,
        loading,
        error,
        pagination,
        refetch: fetchData,
        setPage,
        setSearch,
        setKondisiFilter,
        setStatusFilter,
    }
}

/**
 * Hook to fetch active peminjaman for dropdown
 */
export function usePeminjamanAktif(): UsePeminjamanAktifResult {
    const [data, setData] = useState<PeminjamanAktif[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await pengembalianApi.getActivePeminjaman()

            if (response.success && response.data) {
                setData(response.data)
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal memuat data peminjaman aktif'
            setError(message)
            console.error('Error fetching active peminjaman:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return {
        data,
        loading,
        error,
        refetch: fetchData,
    }
}

/**
 * Hook to create a new pengembalian
 */
export function useCreatePengembalian(onSuccess?: () => void): UseCreatePengembalianResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const createPengembalian = async (data: CreatePengembalianInput): Promise<Pengembalian | null> => {
        setLoading(true)
        setError(null)

        try {
            const response = await pengembalianApi.create(data)

            if (response.success && response.data) {
                toast.success(response.message || 'Pengembalian berhasil diproses')
                onSuccess?.()
                return response.data
            }

            throw new Error('Gagal memproses pengembalian')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal memproses pengembalian'
            setError(message)
            toast.error(message)
            return null
        } finally {
            setLoading(false)
        }
    }

    return { createPengembalian, loading, error }
}

/**
 * Hook to update a pengembalian
 */
export function useUpdatePengembalian(onSuccess?: () => void): UseUpdatePengembalianResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const updatePengembalian = async (id: number, data: UpdatePengembalianInput): Promise<Pengembalian | null> => {
        setLoading(true)
        setError(null)

        try {
            const response = await pengembalianApi.update(id, data)

            if (response.success && response.data) {
                toast.success(response.message || 'Data pengembalian berhasil diperbarui')
                onSuccess?.()
                return response.data
            }

            throw new Error('Gagal mengupdate data pengembalian')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal mengupdate data pengembalian'
            setError(message)
            toast.error(message)
            return null
        } finally {
            setLoading(false)
        }
    }

    return { updatePengembalian, loading, error }
}

/**
 * Hook to delete a pengembalian
 */
export function useDeletePengembalian(onSuccess?: () => void): UseDeletePengembalianResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const deletePengembalian = async (id: number): Promise<boolean> => {
        setLoading(true)
        setError(null)

        try {
            const response = await pengembalianApi.delete(id)

            if (response.success) {
                toast.success(response.message || 'Data pengembalian berhasil dihapus')
                onSuccess?.()
                return true
            }

            throw new Error('Gagal menghapus data pengembalian')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal menghapus data pengembalian'
            setError(message)
            toast.error(message)
            return false
        } finally {
            setLoading(false)
        }
    }

    return { deletePengembalian, loading, error }
}
