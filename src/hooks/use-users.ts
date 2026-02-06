'use client'

import { useState, useEffect, useCallback } from 'react'
import { usersApi, User, CreateUserInput, UpdateUserInput, UsersParams, ApiError } from '@/lib/api-client'
import { toast } from 'sonner'

interface UseUsersResult {
    users: User[]
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
    setRoleFilter: (role: string) => void
    setStatusFilter: (status: string) => void
}

interface UseUserMutationResult {
    loading: boolean
    error: string | null
}

interface UseCreateUserResult extends UseUserMutationResult {
    createUser: (data: CreateUserInput) => Promise<User | null>
}

interface UseUpdateUserResult extends UseUserMutationResult {
    updateUser: (id: number, data: UpdateUserInput) => Promise<User | null>
}

interface UseDeleteUserResult extends UseUserMutationResult {
    deleteUser: (id: number) => Promise<boolean>
}

/**
 * Hook to fetch users with pagination and filtering
 */
export function useUsers(initialParams?: UsersParams): UseUsersResult {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState({
        page: initialParams?.page || 1,
        limit: initialParams?.limit || 10,
        total: 0,
        totalPages: 0,
    })
    const [params, setParams] = useState<UsersParams>(initialParams || {})

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await usersApi.getAll({
                ...params,
                page: pagination.page,
                limit: pagination.limit,
            })

            if (response.success && response.data) {
                setUsers(response.data)
                if (response.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        ...response.pagination,
                    }))
                }
            }
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal memuat data user'
            setError(message)
            console.error('Error fetching users:', err)
        } finally {
            setLoading(false)
        }
    }, [params, pagination.page, pagination.limit])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const setPage = useCallback((page: number) => {
        setPagination(prev => ({ ...prev, page }))
    }, [])

    const setSearch = useCallback((search: string) => {
        setParams(prev => ({ ...prev, search }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }, [])

    const setRoleFilter = useCallback((role: string) => {
        setParams(prev => ({ ...prev, role }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }, [])

    const setStatusFilter = useCallback((status: string) => {
        setParams(prev => ({ ...prev, status }))
        setPagination(prev => ({ ...prev, page: 1 }))
    }, [])

    return {
        users,
        loading,
        error,
        pagination,
        refetch: fetchUsers,
        setPage,
        setSearch,
        setRoleFilter,
        setStatusFilter,
    }
}

/**
 * Hook to create a new user
 */
export function useCreateUser(onSuccess?: () => void): UseCreateUserResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const createUser = async (data: CreateUserInput): Promise<User | null> => {
        setLoading(true)
        setError(null)

        try {
            const response = await usersApi.create(data)

            if (response.success && response.data) {
                toast.success(response.message || 'User berhasil dibuat')
                onSuccess?.()
                return response.data
            }

            throw new Error('Gagal membuat user')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal membuat user'
            setError(message)
            toast.error(message)
            return null
        } finally {
            setLoading(false)
        }
    }

    return { createUser, loading, error }
}

/**
 * Hook to update a user
 */
export function useUpdateUser(onSuccess?: (updatedUserId?: number) => void): UseUpdateUserResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const updateUser = async (id: number, data: UpdateUserInput): Promise<User | null> => {
        setLoading(true)
        setError(null)

        try {
            const response = await usersApi.update(id, data)

            if (response.success && response.data) {
                toast.success(response.message || 'User berhasil diupdate')
                onSuccess?.(id)
                return response.data
            }

            throw new Error('Gagal mengupdate user')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal mengupdate user'
            setError(message)
            toast.error(message)
            return null
        } finally {
            setLoading(false)
        }
    }

    return { updateUser, loading, error }
}

/**
 * Hook to delete a user
 */
export function useDeleteUser(onSuccess?: () => void): UseDeleteUserResult {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const deleteUser = async (id: number): Promise<boolean> => {
        setLoading(true)
        setError(null)

        try {
            const response = await usersApi.delete(id)

            if (response.success) {
                toast.success(response.message || 'User berhasil dihapus')
                onSuccess?.()
                return true
            }

            throw new Error('Gagal menghapus user')
        } catch (err) {
            const message = err instanceof ApiError ? err.message : 'Gagal menghapus user'
            setError(message)
            toast.error(message)
            return false
        } finally {
            setLoading(false)
        }
    }

    return { deleteUser, loading, error }
}
