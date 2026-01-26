import { useState, useEffect, useCallback } from 'react'
import { Alat, Kategori } from '@prisma/client'

// Define Types based on API response
export interface FeaturedTool extends Alat {
    kategori: {
        id: number
        nama: string
    } | null
}

export interface CategoryWithCount extends Kategori {
    _count: {
        alat: number
    }
}

export interface PeminjamHomeData {
    activeLoanCount: number
    categories: CategoryWithCount[]
    featuredTools: FeaturedTool[]
}

export function usePeminjamHome() {
    const [data, setData] = useState<PeminjamHomeData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/peminjam/home')
            const result = await res.json()

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch home data')
            }

            setData(result.data)
        } catch (err) {
            console.error('Error fetching peminjam home data:', err)
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    return { data, loading, error, refetch: fetchData }
}
