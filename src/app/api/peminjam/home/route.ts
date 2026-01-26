import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import prisma from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Parallel fetch for homepage data
        const [activeLoanCount, categories, featuredTools] = await Promise.all([
            // 1. Active Loans Count for current user
            prisma.peminjaman.count({
                where: {
                    userId: parseInt(session.user.id),
                    status: 'dipinjam'
                }
            }),

            // 2. Categories (All)
            prisma.kategori.findMany({
                orderBy: { nama: 'asc' },
                include: {
                    _count: {
                        select: { alat: true }
                    }
                }
            }),

            // 3. Featured Tools (Latest 6)
            prisma.alat.findMany({
                where: {
                    status: 'tersedia' // Optional: only show available tools? Or all? Let's show all latest.
                },
                orderBy: { createdAt: 'desc' },
                take: 6,
                include: {
                    kategori: {
                        select: {
                            id: true,
                            nama: true
                        }
                    }
                }
            })
        ])

        return NextResponse.json({
            success: true,
            data: {
                activeLoanCount,
                categories,
                featuredTools
            }
        })

    } catch (error) {
        console.error('Error fetching peminjam home data:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
