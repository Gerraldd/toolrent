import { useState, useEffect, useCallback } from 'react'
import { Alat, Kategori } from '@prisma/client'

export interface AlatDetail extends Alat {
    kategori: Kategori
}

export function useAlatDetail(id: string) {
    const [data, setData] = useState<AlatDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        if (!id) return

        try {
            setLoading(true)
            setError(null)
            const res = await fetch(`/api/alat/${id}`)
            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || 'Failed to fetch alat details')
            }

            setData(result.data)
        } catch (err) {
            console.error('Error fetching alat detail:', err)
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return { data, loading, error, refetch: fetchData }
}
