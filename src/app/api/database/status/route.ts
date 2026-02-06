import { NextResponse } from 'next/server'
import { getPrisma } from '@/lib/prisma'

export async function GET() {
    try {
        const prisma = await getPrisma()

        // Check if users table has any data
        const userCount = await prisma.user.count()

        return NextResponse.json({
            success: true,
            isEmpty: userCount === 0,
            userCount: userCount
        })

    } catch (error: any) {
        console.error('Database status check error:', error)

        // If error is because table doesn't exist, database is empty
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
            return NextResponse.json({
                success: true,
                isEmpty: true,
                userCount: 0
            })
        }

        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to check database status',
                isEmpty: true,
                userCount: 0
            },
            { status: 500 }
        )
    }
}
