import { useState, useEffect, useCallback } from 'react'

export interface ActiveLoan {
    id: number
    kode: string
    alat: {
        id: number
        kode: string
        nama: string
        gambar: string | null
    }
    tanggalPinjam: string
    tanggalKembaliRencana: string
    jumlah: number
    keperluan: string
    status: string
}

export function useActiveLoans() {
    const [data, setData] = useState<ActiveLoan[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/peminjam/my-active-loans')
            const result = await res.json()

            if (!res.ok) {
                throw new Error(result.error || 'Failed to fetch active loans')
            }

            setData(result.data)
        } catch (err) {
            console.error('Error fetching active loans:', err)
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
