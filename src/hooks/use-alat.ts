'use client'

import { useState, useEffect, useCallback } from 'react'
import { alatApi, Alat, CreateAlatInput, UpdateAlatInput, AlatParams, ApiError } from '@/lib/api-client'
import { toast } from 'sonner'

interface UseAlatResult {
    alat: Alat[]
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
    setKategoriFilter: (kategoriId: string) => void
    setStatusFilter: (status: string) => void
}

interface UseAlatMutationResult {
    loading: boolean
    error: string | null
}

interface UseCreateAlatResult extends UseAlatMutationResult {
    createAlat: (data: CreateAlatInput) => Promise<Alat | null>
}

interface UseUpdateAlatResult extends UseAlatMutationResult {
    updateAlat: (id: number, data: UpdateAlatInput) => Promise<Alat | null>
}

interface UseDeleteAlatResult extends UseAlatMutationResult {
    deleteAlat: (id: number) => Promise<boolean>
}

/**
 * Hook to fetch alat with pagination and filtering
 */
export function useAlat(initialParams?: AlatParams): UseAlatResult {
    const [alat, setAlat] = useState<Alat[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState({
        page: initialParams?.page || 1,
        limit: initialParams?.limit || 10,
        total: 0,
        totalPages: 0,
    })
    const [params, setParams] = useState<AlatParams>(initialParams || {})

    const fetchAlat = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await alatApi.getAll({
                ...params,
                page: pagination.page,
                limit: pagination.limit,
            })

            if (response.success && response.data) {
                setAlat(response.data)
                if (response.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        ...response.pagination,
                    }))
                }
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal memuat data alat'
            setError(message)
            console.error('Error fetching alat:', err)
        } finally {
            setLoading(false)
        }
    }, [params, pagination.page, pagination.limit])

    useEffect(() => {
        fetchAlat()
    }, [fetchAlat])

    const setPage = useCallback((page: number) => {
        setPagination(prev => ({ ...prev, page }))
    }, [])

    const setSearch = useCallback((search: string) => {
        setParams(prev => ({ ...prev, search }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }, [])

    const setKategoriFilter = useCallback((kategoriId: string) => {
        setParams(prev => ({ ...prev, kategoriId }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }, [])

    const setStatusFilter = useCallback((status: string) => {
        setParams(prev => ({ ...prev, status }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }, [])

    return {
        alat,
        loading,
        error,
        pagination,
        refetch: fetchAlat,
        setPage,
        setSearch,
        setKategoriFilter,
        setStatusFilter,
    }
}

/**
 * Hook to create a new alat
 */
export function useCreateAlat(onSuccess?: () => void): UseCreateAlatResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const createAlat = async (data: CreateAlatInput): Promise<Alat | null> => {
        setLoading(true)
        setError(null)

        try {
            const response = await alatApi.create(data)

            if (response.success && response.data) {
                toast.success(response.message || 'Alat berhasil dibuat')
                onSuccess?.()
                return response.data
            }

            throw new Error('Gagal membuat alat')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal membuat alat'
            setError(message)
            toast.error(message)
            return null
        } finally {
            setLoading(false)
        }
    }

    return { createAlat, loading, error }
}

/**
 * Hook to update an alat
 */
export function useUpdateAlat(onSuccess?: () => void): UseUpdateAlatResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const updateAlat = async (id: number, data: UpdateAlatInput): Promise<Alat | null> => {
        setLoading(true)
        setError(null)

        try {
            const response = await alatApi.update(id, data)

            if (response.success && response.data) {
                toast.success(response.message || 'Alat berhasil diupdate')
                onSuccess?.()
                return response.data
            }

            throw new Error('Gagal mengupdate alat')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal mengupdate alat'
            setError(message)
            toast.error(message)
            return null
        } finally {
            setLoading(false)
        }
    }

    return { updateAlat, loading, error }
}

/**
 * Hook to delete an alat
 */
export function useDeleteAlat(onSuccess?: () => void): UseDeleteAlatResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const deleteAlat = async (id: number): Promise<boolean> => {
        setLoading(true)
        setError(null)

        try {
            const response = await alatApi.delete(id)

            if (response.success) {
                toast.success(response.message || 'Alat berhasil dihapus')
                onSuccess?.()
                return true
            }

            throw new Error('Gagal menghapus alat')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal menghapus alat'
            setError(message)
            toast.error(message)
            return false
        } finally {
            setLoading(false)
        }
    }

    return { deleteAlat, loading, error }
}
