import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { cookies } from 'next/headers'
import * as fs from 'fs'
import * as path from 'path'

function getServerPool() {
    return new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        database: 'postgres'
    })
}

export async function DELETE(request: NextRequest) {
    const pool = getServerPool()

    try {
        const body = await request.json()
        const { masterPassword, databaseName } = body

        // Validate master password
        if (masterPassword !== process.env.DB_MASTER_PASSWORD) {
            return NextResponse.json({
                success: false,
                error: 'Wrong master password'
            }, { status: 401 })
        }

        if (!databaseName) {
            return NextResponse.json({
                success: false,
                error: 'Database name is required'
            }, { status: 400 })
        }

        // Check if database exists
        const existsResult = await pool.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [databaseName]
        )

        if (existsResult.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Database does not exist'
            }, { status: 404 })
        }

        // Check if this is the currently selected database
        const cookieStore = await cookies()
        const selectedDb = cookieStore.get('selected_database')?.value

        // Terminate all connections to the database
        await pool.query(`
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = $1
              AND pid <> pg_backend_pid()
        `, [databaseName])

        // Drop the database
        await pool.query(`DROP DATABASE "${databaseName}"`)

        // If the deleted database was the active one, clear the selection
        let clearedSelection = false
        if (selectedDb === databaseName) {
            cookieStore.delete('selected_database')

            // Also clear .env.local file
            const envLocalPath = path.join(process.cwd(), '.env.local')
            if (fs.existsSync(envLocalPath)) {
                fs.unlinkSync(envLocalPath)
            }
            clearedSelection = true
        }

        return NextResponse.json({
            success: true,
            message: 'Database deleted successfully',
            clearedSelection
        })

    } catch (error: any) {
        console.error('Delete database error:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to delete database'
        }, { status: 500 })
    } finally {
        await pool.end()
    }
}
