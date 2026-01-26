'use client'

import { useState, useEffect, useCallback } from 'react'
import { logAktivitasApi, LogAktivitas, LogAktivitasParams, ApiError } from '@/lib/api-client'
import { toast } from 'sonner'

interface UseLogsResult {
    logs: LogAktivitas[]
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
    setAksiFilter: (aksi: string) => void
}

interface UseDeleteLogsResult {
    deleteLogs: (ids: number[]) => Promise<boolean>
    loading: boolean
    error: string | null
}

/**
 * Hook to fetch logs with pagination and filtering
 */
export function useLogs(initialParams?: LogAktivitasParams): UseLogsResult {
    const [logs, setLogs] = useState<LogAktivitas[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState({
        page: initialParams?.page || 1,
        limit: initialParams?.limit || 10,
        total: 0,
        totalPages: 0,
    })
    const [params, setParams] = useState<LogAktivitasParams>(initialParams || {})

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await logAktivitasApi.getAll({
                ...params,
                page: pagination.page,
                limit: pagination.limit,
            })

            if (response.success && response.data) {
                setLogs(response.data)
                if (response.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        ...response.pagination,
                    }))
                }
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal memuat log aktivitas'
            setError(message)
            console.error('Error fetching logs:', err)
        } finally {
            setLoading(false)
        }
    }, [params, pagination.page, pagination.limit])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    const setPage = useCallback((page: number) => {
        setPagination(prev => ({ ...prev, page }))
    }, [])

    const setSearch = useCallback((search: string) => {
        setParams(prev => ({ ...prev, search }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }, [])

    const setAksiFilter = useCallback((aksi: string) => {
        setParams(prev => ({ ...prev, aksi }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }, [])

    return {
        logs,
        loading,
        error,
        pagination,
        refetch: fetchLogs,
        setPage,
        setSearch,
        setAksiFilter,
    }
}

/**
 * Hook to delete logs
 */
export function useDeleteLogs(onSuccess?: () => void): UseDeleteLogsResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const deleteLogs = async (ids: number[]): Promise<boolean> => {
        setLoading(true)
        setError(null)

        try {
            const response = await logAktivitasApi.delete(ids)

            if (response.success) {
                toast.success(response.message || 'Log berhasil dihapus')
                onSuccess?.()
                return true
            }

            throw new Error('Gagal menghapus log')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal menghapus log'
            setError(message)
            toast.error(message)
            return false
        } finally {
            setLoading(false)
        }
    }

    return { deleteLogs, loading, error }
}
