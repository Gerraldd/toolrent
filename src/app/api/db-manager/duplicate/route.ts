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
        const body = await request.json()
        const { masterPassword, sourceDatabaseName, newDatabaseName } = body

        // Validate master password
        if (masterPassword !== process.env.DB_MASTER_PASSWORD) {
            return NextResponse.json({
                success: false,
                error: 'Wrong master password'
            }, { status: 401 })
        }

        if (!sourceDatabaseName || !newDatabaseName) {
            return NextResponse.json({
                success: false,
                error: 'Source and new database names are required'
            }, { status: 400 })
        }

        // Validate new database name
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(newDatabaseName)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid database name'
            }, { status: 400 })
        }

        // Check if source database exists
        const sourceExists = await pool.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [sourceDatabaseName]
        )

        if (sourceExists.rows.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Source database does not exist'
            }, { status: 404 })
        }

        // Check if new database already exists
        const newExists = await pool.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [newDatabaseName]
        )

        if (newExists.rows.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'Database with new name already exists'
            }, { status: 409 })
        }

        const pgDumpPath = process.env.PG_DUMP_PATH || 'pg_dump'
        const psqlPath = process.env.PSQL_PATH || 'psql'
        const host = process.env.POSTGRES_HOST || 'localhost'
        const port = process.env.POSTGRES_PORT || '5432'
        const user = process.env.POSTGRES_USER || 'postgres'
        const password = process.env.POSTGRES_PASSWORD || 'postgres'

        const env = {
            ...process.env,
            PGPASSWORD: password
        }

        // Create temp file for dump
        const tempDir = path.join(os.tmpdir(), 'db-duplicate')
        await mkdir(tempDir, { recursive: true })
        tempFilePath = path.join(tempDir, `dup_${Date.now()}.sql`)

        // Dump the source database
        const dumpCommand = `"${pgDumpPath}" -h ${host} -p ${port} -U ${user} -d "${sourceDatabaseName}" --no-owner --no-acl -f "${tempFilePath}"`
        await execPromise(dumpCommand, { env, maxBuffer: 100 * 1024 * 1024 })

        // Create the new database
        await pool.query(`CREATE DATABASE "${newDatabaseName}"`)

        // Restore to the new database
        const restoreCommand = `"${psqlPath}" -h ${host} -p ${port} -U ${user} -d "${newDatabaseName}" -f "${tempFilePath}"`
        await execPromise(restoreCommand, { env, maxBuffer: 100 * 1024 * 1024 })

        return NextResponse.json({
            success: true,
            message: 'Database duplicated successfully',
            database: newDatabaseName
        })

    } catch (error: any) {
        console.error('Duplicate database error:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to duplicate database'
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
