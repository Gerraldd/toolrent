import { NextResponse } from 'next/server'

export async function GET() {
    const dbList = process.env.DB_LIST === 'true'

    return NextResponse.json({
        success: true,
        dbListEnabled: dbList
    })
}
