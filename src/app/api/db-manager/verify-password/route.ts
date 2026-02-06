import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { password } = await request.json()

        if (!password) {
            return NextResponse.json(
                { success: false, error: 'Password is required' },
                { status: 400 }
            )
        }

        const masterPassword = process.env.DB_MASTER_PASSWORD

        if (!masterPassword) {
            return NextResponse.json(
                { success: false, error: 'Master password not configured' },
                { status: 500 }
            )
        }

        if (password !== masterPassword) {
            return NextResponse.json(
                { success: false, error: 'Invalid master password' },
                { status: 401 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error verifying master password:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to verify password' },
            { status: 500 }
        )
    }
}
