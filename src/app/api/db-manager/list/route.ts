import { NextResponse } from 'next/server'
import { Pool } from 'pg'

// Singleton pool for better performance
let serverPool: Pool | null = null

function getServerPool() {
    if (!serverPool) {
        serverPool = new Pool({
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'postgres',
            database: 'postgres',
            max: 5, // Limit connections
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        })
    }
    return serverPool
}

// Required tables from Prisma schema (check lowercase since PostgreSQL stores names in lowercase)
const REQUIRED_TABLES = ['user', 'kategori', 'alat', 'peminjaman', 'pengembalian', 'logaktivitas']

async function checkDatabaseSchema(dbName: string): Promise<boolean> {
    const pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || 'postgres',
        database: dbName,
        max: 1,
        connectionTimeoutMillis: 3000
    })

    try {
        // Check if required tables exist
        const result = await pool.query(`
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
        `)

        const existingTables = result.rows.map(row => row.tablename.toLowerCase())

        // Check if at least 4 of 6 required tables exist (handles minor schema differences)
        const matchCount = REQUIRED_TABLES.filter(table =>
            existingTables.includes(table)
        ).length

        await pool.end()
        // Valid if at least 4 tables match
        return matchCount >= 4
    } catch (error) {
        try { await pool.end() } catch { }
        // If connection fails, assume invalid schema
        return false
    }
}

export async function GET() {
    const pool = getServerPool()

    try {
        // Optimized query - skip pg_database_size for faster loading
        // Size can be loaded on-demand if needed
        const result = await pool.query(`
            SELECT datname as name
            FROM pg_database 
            WHERE datistemplate = false 
              AND datname NOT IN ('postgres')
            ORDER BY datname
        `)

        // Check schema for each database
        const databases = await Promise.all(
            result.rows.map(async row => {
                const hasValidSchema = await checkDatabaseSchema(row.name)
                return {
                    name: row.name,
                    size: '-', // Skip size calculation for speed
                    sizeBytes: 0,
                    hasValidSchema
                }
            })
        )

        return NextResponse.json({
            success: true,
            databases
        })
    } catch (error: any) {
        console.error('Error listing databases:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to list databases'
        }, { status: 500 })
    }
    // Note: Don't close pool - it's a singleton for reuse
}
