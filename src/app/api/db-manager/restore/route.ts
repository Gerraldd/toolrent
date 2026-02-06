import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'
import os from 'os'

const execPromise = promisify(exec)

function getServerPool() {
    return new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        database: 'postgres'
    })
}

export async function POST(request: NextRequest) {
    const pool = getServerPool()
    let tempFilePath = ''

    try {
        const formData = await request.formData()
        const masterPassword = formData.get('masterPassword') as string
        const databaseName = formData.get('databaseName') as string
        const file = formData.get('file') as File

        // Validate master password
        if (masterPassword !== process.env.DB_MASTER_PASSWORD) {
            return NextResponse.json({
                success: false,
                error: 'Wrong master password'
            }, { status: 401 })
        }

        if (!databaseName || !file) {
            return NextResponse.json({
                success: false,
                error: 'Database name and file are required'
            }, { status: 400 })
        }

        // Validate database name
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(databaseName)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid database name'
            }, { status: 400 })
        }

        // Check if database already exists
        const existsResult = await pool.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [databaseName]
        )

        if (existsResult.rows.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'Database already exists. Delete it first or use a different name.'
            }, { status: 409 })
        }

        // Create the database
        await pool.query(`CREATE DATABASE "${databaseName}"`)

        // Save uploaded file to temp
        const tempDir = path.join(os.tmpdir(), 'db-restore')
        await mkdir(tempDir, { recursive: true })
        tempFilePath = path.join(tempDir, `restore_${Date.now()}.sql`)

        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(tempFilePath, buffer)

        // Restore the database using psql
        const psqlPath = process.env.PSQL_PATH || 'psql'
        const host = process.env.POSTGRES_HOST || 'localhost'
        const port = process.env.POSTGRES_PORT || '5432'
        const user = process.env.POSTGRES_USER || 'postgres'
        const password = process.env.POSTGRES_PASSWORD || 'postgres'

        const restoreCommand = `"${psqlPath}" -h ${host} -p ${port} -U ${user} -d "${databaseName}" -f "${tempFilePath}"`

        await execPromise(restoreCommand, {
            env: {
                ...process.env,
                PGPASSWORD: password
            },
            maxBuffer: 100 * 1024 * 1024
        })

        return NextResponse.json({
            success: true,
            message: 'Database restored successfully',
            database: databaseName
        })

    } catch (error: any) {
        console.error('Restore database error:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to restore database'
        }, { status: 500 })
    } finally {
        // Cleanup temp file
        if (tempFilePath) {
            try {
                await unlink(tempFilePath)
            } catch {
                // Ignore cleanup errors
            }
        }
        await pool.end()
    }
}
