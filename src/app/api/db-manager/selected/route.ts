import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const cookieStore = await cookies()
        const selectedDb = cookieStore.get('selected_database')?.value || null

        return NextResponse.json({
            success: true,
            selectedDatabase: selectedDb
        })
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to get selected database'
        }, { status: 500 })
    }
}
