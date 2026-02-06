import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getPrisma } from '@/lib/prisma'
import { verifyAuth, hasRole } from '@/lib/auth-api'
import { getIpAddress } from '@/lib/utils'

// POST /api/users/import - Bulk import users
export async function POST(request: NextRequest) {
    try {
        const auth = await verifyAuth(request)

        if (!auth.authenticated || !auth.user) {
            return NextResponse.json(
                { success: false, error: auth.error || 'Unauthorized' },
                { status: 401 }
            )
        }

        const prisma = await getPrisma()

        if (!hasRole(auth.user, 'admin')) {
            return NextResponse.json(
                { success: false, error: 'Hanya admin yang dapat mengimport user' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { data } = body

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Data import tidak valid' },
                { status: 400 }
            )
        }

        // Validate all items have required fields
        interface ImportUserItem {
            nama?: string
            email?: string
            password?: string
            role?: string
            noTelepon?: string
            alamat?: string
            status?: string
        }

        const invalidItems = data.filter((item: ImportUserItem) =>
            !item.nama || item.nama.trim() === '' ||
            !item.email || item.email.trim() === ''
        )
        if (invalidItems.length > 0) {
            return NextResponse.json(
                { success: false, error: `${invalidItems.length} baris tidak memiliki nama atau email` },
                { status: 400 }
            )
        }

        // Get existing emails for duplicate detection
        const existingUsers = await prisma.user.findMany({
            select: { email: true }
        })
        const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()))

        // Filter out duplicates and prepare data
        interface NewUserItem {
            nama: string
            email: string
            password: string
            role: 'admin' | 'petugas' | 'peminjam'
            noTelepon: string
            alamat: string
            status: 'aktif' | 'nonaktif'
        }
        const newItems: NewUserItem[] = []
        const duplicates: string[] = []
        const seenEmails = new Set<string>()

        // Default password for imported users
        const defaultPassword = await bcrypt.hash('password123', 12)

        for (const item of data as ImportUserItem[]) {
            const namaTrimmed = item.nama?.trim() || ''
            const emailTrimmed = item.email?.trim().toLowerCase() || ''

            if (existingEmails.has(emailTrimmed) || seenEmails.has(emailTrimmed)) {
                duplicates.push(emailTrimmed)
            } else {
                seenEmails.add(emailTrimmed)

                // Validate role
                let role: 'admin' | 'petugas' | 'peminjam' = 'peminjam'
                if (item.role) {
                    const roleLower = item.role.trim().toLowerCase()
                    if (roleLower === 'admin') role = 'admin'
                    else if (roleLower === 'petugas') role = 'petugas'
                    else role = 'peminjam'
                }

                // Validate status
                let status: 'aktif' | 'nonaktif' = 'aktif'
                if (item.status) {
                    const statusLower = item.status.trim().toLowerCase()
                    if (statusLower === 'nonaktif' || statusLower === 'inactive') {
                        status = 'nonaktif'
                    }
                }

                // Hash password if provided, otherwise use default
                let hashedPassword = defaultPassword
                if (item.password && item.password.trim().length >= 6) {
                    hashedPassword = await bcrypt.hash(item.password.trim(), 12)
                }

                newItems.push({
                    nama: namaTrimmed,
                    email: emailTrimmed,
                    password: hashedPassword,
                    role,
                    noTelepon: item.noTelepon?.trim() || '',
                    alamat: item.alamat?.trim() || '',
                    status
                })
            }
        }

        if (newItems.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Semua email sudah terdaftar atau duplikat',
                duplicates
            }, { status: 400 })
        }

        // Create all users in a transaction
        const created = await prisma.$transaction(
            newItems.map(item =>
                prisma.user.create({
                    data: {
                        nama: item.nama,
                        email: item.email,
                        password: item.password,
                        role: item.role,
                        noTelepon: item.noTelepon || null,
                        alamat: item.alamat || null,
                        status: item.status
                    }
                })
            )
        )

        // Log activity
        await prisma.logAktivitas.create({
            data: {
                userId: parseInt(auth.user.id),
                aksi: 'CREATE',
                tabel: 'users',
                recordId: created[0]?.id || 0,
                deskripsi: `Import ${created.length} user baru`,
                ipAddress: getIpAddress(request)
            },
        })

        return NextResponse.json({
            success: true,
            message: `${created.length} user berhasil diimport`,
            data: {
                imported: created.length,
                duplicates: duplicates.length,
                duplicateEmails: duplicates.slice(0, 10) // Show max 10 duplicate emails
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Error importing users:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
