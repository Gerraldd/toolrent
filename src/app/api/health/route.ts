import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
    try {
        // Attempt a simple query to verify database connection
        await prisma.$queryRaw`SELECT 1`

        return NextResponse.json(
            { status: 'ok', message: 'Database connection successful' },
            { status: 200 }
        )
    } catch (error) {
        console.error('Health check failed:', error)
        return NextResponse.json(
            {
                status: 'error',
                message: 'Database connection failed',
                detail: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 503 }
        )
    }
}
