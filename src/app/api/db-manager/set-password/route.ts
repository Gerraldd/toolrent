import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { currentPassword, newPassword } = body

        // Validate current master password
        if (currentPassword !== process.env.DB_MASTER_PASSWORD) {
            return NextResponse.json({
                success: false,
                error: 'Wrong current master password'
            }, { status: 401 })
        }

        if (!newPassword || newPassword.length < 6) {
            return NextResponse.json({
                success: false,
                error: 'New password must be at least 6 characters'
            }, { status: 400 })
        }

        // Update .env file
        const envPath = path.join(process.cwd(), '.env')
        let envContent = await readFile(envPath, 'utf-8')

        // Replace the master password line
        envContent = envContent.replace(
            /DB_MASTER_PASSWORD="[^"]*"/,
            `DB_MASTER_PASSWORD="${newPassword}"`
        )

        await writeFile(envPath, envContent, 'utf-8')

        // Update the process.env (won't take effect until restart)
        process.env.DB_MASTER_PASSWORD = newPassword

        return NextResponse.json({
            success: true,
            message: 'Master password updated successfully. Please restart the server for changes to take full effect.'
        })

    } catch (error: any) {
        console.error('Set password error:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to update master password'
        }, { status: 500 })
    }
}
