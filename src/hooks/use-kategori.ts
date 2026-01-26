'use client'

import { useState, useEffect, useCallback } from 'react'
import { kategoriApi, Kategori, CreateKategoriInput, UpdateKategoriInput, ApiError } from '@/lib/api-client'
import { toast } from 'sonner'

interface UseKategoriResult {
    kategori: Kategori[]
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
    setSearch: (search: string) => void
}

interface UseKategoriMutationResult {
    loading: boolean
    error: string | null
}

interface UseCreateKategoriResult extends UseKategoriMutationResult {
    createKategori: (data: CreateKategoriInput) => Promise<Kategori | null>
}

interface UseUpdateKategoriResult extends UseKategoriMutationResult {
    updateKategori: (id: number, data: UpdateKategoriInput) => Promise<Kategori | null>
}

interface UseDeleteKategoriResult extends UseKategoriMutationResult {
    deleteKategori: (id: number) => Promise<boolean>
}

/**
 * Hook to fetch kategori with search
 */
export function useKategori(initialSearch?: string): UseKategoriResult {
    const [kategori, setKategori] = useState<Kategori[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [search, setSearchState] = useState(initialSearch || '')

    const fetchKategori = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await kategoriApi.getAll(search || undefined)

            if (response.success && response.data) {
                setKategori(response.data)
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal memuat data kategori'
            setError(message)
            console.error('Error fetching kategori:', err)
        } finally {
            setLoading(false)
        }
    }, [search])

    useEffect(() => {
        fetchKategori()
    }, [fetchKategori])

    const setSearch = useCallback((newSearch: string) => {
        setSearchState(newSearch)
    }, [])

    return {
        kategori,
        loading,
        error,
        refetch: fetchKategori,
        setSearch,
    }
}

/**
 * Hook to create a new kategori
 */
export function useCreateKategori(onSuccess?: () => void): UseCreateKategoriResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const createKategori = async (data: CreateKategoriInput): Promise<Kategori | null> => {
        setLoading(true)
        setError(null)

        try {
            const response = await kategoriApi.create(data)

            if (response.success && response.data) {
                toast.success(response.message || 'Kategori berhasil dibuat')
                onSuccess?.()
                return response.data
            }

            throw new Error('Gagal membuat kategori')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal membuat kategori'
            setError(message)
            toast.error(message)
            return null
        } finally {
            setLoading(false)
        }
    }

    return { createKategori, loading, error }
}

/**
 * Hook to update a kategori
 */
export function useUpdateKategori(onSuccess?: () => void): UseUpdateKategoriResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const updateKategori = async (id: number, data: UpdateKategoriInput): Promise<Kategori | null> => {
        setLoading(true)
        setError(null)

        try {
            const response = await kategoriApi.update(id, data)

            if (response.success && response.data) {
                toast.success(response.message || 'Kategori berhasil diupdate')
                onSuccess?.()
                return response.data
            }

            throw new Error('Gagal mengupdate kategori')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal mengupdate kategori'
            setError(message)
            toast.error(message)
            return null
        } finally {
            setLoading(false)
        }
    }

    return { updateKategori, loading, error }
}

/**
 * Hook to delete a kategori
 */
export function useDeleteKategori(onSuccess?: () => void): UseDeleteKategoriResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const deleteKategori = async (id: number): Promise<boolean> => {
        setLoading(true)
        setError(null)

        try {
            const response = await kategoriApi.delete(id)

            if (response.success) {
                toast.success(response.message || 'Kategori berhasil dihapus')
                onSuccess?.()
                return true
            }

            throw new Error('Gagal menghapus kategori')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal menghapus kategori'
            setError(message)
            toast.error(message)
            return false
        } finally {
            setLoading(false)
        }
    }

    return { deleteKategori, loading, error }
}
