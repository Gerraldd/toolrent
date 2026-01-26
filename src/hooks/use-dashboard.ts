'use client'

import { useState, useEffect, useCallback } from 'react'

// Types
export interface DashboardStats {
    totalUsers: number
    newUsersThisMonth: number
    userGrowth: number
    totalAlat: number
    newAlatThisMonth: number
    activeLoans: number
    overdueLoans: number
    pendingCount: number
    returnsInRangeCount: number
    finesInRange: number
}

export interface ChartDataPoint {
    label: string
    count: number
}

export interface CategoryStat {
    id: number
    name: string
    alatCount: number
    loanCount: number
    color: string
    percentage: number
}

export interface RecentActivity {
    id: number
    user: string
    userEmail: string
    userRole: string
    initials: string
    action: string
    actionType: string // 'CREATE', 'UPDATE', etc.
    item: string
    time: string
    timestamp: string // ISO string for precise date
    color: string
    // Detailed fields
    tabel?: string
    recordId?: number
    deskripsi?: string
    ipAddress?: string
    userAgent?: string
}

export interface DashboardData {
    stats: DashboardStats
    chartData: ChartDataPoint[]
    categoryStats: CategoryStat[]
    recentActivities: RecentActivity[]
    recentLoans: RecentLoan[]
}

export interface RecentLoan {
    id: number
    user: string
    userId: number
    userEmail: string
    alat: string
    alatId: number
    alatImage: string | null
    tanggalPinjam: string
    tanggalKembali: string
    status: string
    createdAt: string
}

export interface DashboardFilters {
    startDate?: string
    endDate?: string
}

export function useDashboard(filters?: DashboardFilters) {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const startDate = filters?.startDate
    const endDate = filters?.endDate

    const fetchDashboard = useCallback(async (filterParams?: DashboardFilters) => {
        try {
            setLoading(true)
            setError(null)

            // Build query params
            const params = new URLSearchParams()
            // Use params if provided, otherwise use closure captured filters
            const activeFilters = filterParams || { startDate, endDate }

            if (activeFilters?.startDate) {
                params.append('startDate', activeFilters.startDate)
            }
            if (activeFilters?.endDate) {
                params.append('endDate', activeFilters.endDate)
            }

            const queryString = params.toString()
            const url = `/api/dashboard${queryString ? `?${queryString}` : ''}`

            const res = await fetch(url)
            const result = await res.json()

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch dashboard data')
            }

            setData(result.data)
        } catch (err) {
            console.error('Error fetching dashboard:', err)
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
        } finally {
            setLoading(false)
        }
    }, [startDate, endDate])

    useEffect(() => {
        fetchDashboard()
    }, [fetchDashboard])

    const refetch = useCallback(async (newFilters?: DashboardFilters) => {
        await fetchDashboard(newFilters)
    }, [fetchDashboard])

    return {
        data,
        loading,
        error,
        refetch
    }
}
