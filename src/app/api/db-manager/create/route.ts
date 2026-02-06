import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { exec } from 'child_process'
import { promisify } from 'util'
import bcrypt from 'bcryptjs'

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

    try {
        const body = await request.json()
        const { masterPassword, databaseName, adminEmail, adminPassword } = body

        // Validate master password
        if (masterPassword !== process.env.DB_MASTER_PASSWORD) {
            return NextResponse.json({
                success: false,
                error: 'Wrong master password'
            }, { status: 401 })
        }

        // Validate inputs
        if (!databaseName || !adminEmail || !adminPassword) {
            return NextResponse.json({
                success: false,
                error: 'Database name, admin email and password are required'
            }, { status: 400 })
        }

        // Validate database name (only alphanumeric, underscore, hyphen)
        if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(databaseName)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid database name. Use only letters, numbers, underscores and hyphens.'
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
                error: 'Database already exists'
            }, { status: 409 })
        }

        // Create the database
        await pool.query(`CREATE DATABASE "${databaseName}"`)

        // Run Prisma migrations on the new database
        const host = process.env.POSTGRES_HOST || 'localhost'
        const port = process.env.POSTGRES_PORT || '5432'
        const user = process.env.POSTGRES_USER || 'postgres'
        const password = process.env.POSTGRES_PASSWORD || 'postgres'

        const newDbUrl = `postgresql://${user}:${password}@${host}:${port}/${databaseName}?schema=public`

        // Run prisma db push to create schema
        try {
            const prismaCommand = `npx prisma db push --url="${newDbUrl}"`
            console.log('Running prisma command:', prismaCommand)

            const { stdout, stderr } = await execPromise(prismaCommand, {
                cwd: process.cwd(),
                timeout: 60000 // 60 second timeout
            })

            if (stdout) console.log('Prisma stdout:', stdout)
            if (stderr) console.log('Prisma stderr:', stderr)
        } catch (prismaError: any) {
            console.error('Prisma push error:', prismaError.message)
            console.error('Prisma stderr:', prismaError.stderr)
            console.error('Prisma stdout:', prismaError.stdout)
            // Try to drop the database if migration fails
            await pool.query(`DROP DATABASE IF EXISTS "${databaseName}"`)
            return NextResponse.json({
                success: false,
                error: 'Failed to initialize database schema: ' + (prismaError.stderr || prismaError.message)
            }, { status: 500 })
        }

        // Connect to the new database and create admin user
        const newDbPool = new Pool({
            host,
            port: parseInt(port),
            user,
            password,
            database: databaseName
        })

        try {
            // Hash the admin password
            const hashedPassword = await bcrypt.hash(adminPassword, 12)

            // Insert admin user
            await newDbPool.query(`
                INSERT INTO users (nama, email, password, role, status, created_at, updated_at)
                VALUES ($1, $2, $3, 'admin', 'aktif', NOW(), NOW())
            `, ['Administrator', adminEmail, hashedPassword])

        } finally {
            await newDbPool.end()
        }

        return NextResponse.json({
            success: true,
            message: 'Database created successfully',
            database: databaseName
        })

    } catch (error: any) {
        console.error('Create database error:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to create database'
        }, { status: 500 })
    } finally {
        await pool.end()
    }
}
