import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const execPromise = promisify(exec)

// Parse DATABASE_URL to get connection details
function parseDbUrl(url: string) {
    const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/
    const match = url.match(regex)
    if (!match) {
        throw new Error('Invalid DATABASE_URL format')
    }
    return {
        user: match[1],
        password: match[2],
        host: match[3],
        port: match[4],
        database: match[5],
    }
}

export async function POST(request: NextRequest) {
    let tempFilePath: string | null = null

    try {
        // Get form data
        const formData = await request.formData()
        const masterPassword = formData.get('masterPassword') as string
        const file = formData.get('file') as File

        // Validate master password
        const configuredPassword = process.env.DB_MASTER_PASSWORD
        if (!configuredPassword) {
            return NextResponse.json(
                { success: false, error: 'Master password not configured on server' },
                { status: 500 }
            )
        }

        if (masterPassword !== configuredPassword) {
            return NextResponse.json(
                { success: false, error: 'Wrong master password' },
                { status: 401 }
            )
        }

        // Validate file
        if (!file || file.size === 0) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            )
        }

        if (!file.name.endsWith('.sql')) {
            return NextResponse.json(
                { success: false, error: 'File must be a .sql file' },
                { status: 400 }
            )
        }

        const dbUrl = process.env.DATABASE_URL
        if (!dbUrl) {
            return NextResponse.json(
                { success: false, error: 'DATABASE_URL not configured' },
                { status: 500 }
            )
        }

        const dbConfig = parseDbUrl(dbUrl)
        const psqlPath = process.env.PSQL_PATH || 'psql'

        // Save uploaded file to temp directory
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        tempFilePath = join(tmpdir(), `restore_${Date.now()}.sql`)
        await writeFile(tempFilePath, buffer)

        // Set PGPASSWORD environment variable
        const env = { ...process.env, PGPASSWORD: dbConfig.password }

        // First, drop all tables in the public schema
        const dropTablesCommand = `"${psqlPath}" -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO ${dbConfig.user}; GRANT ALL ON SCHEMA public TO public;"`

        try {
            await execPromise(dropTablesCommand, { env })
        } catch (dropError: any) {
            console.error('Drop tables error:', dropError)
            // Continue anyway, restore might still work
        }

        // Execute psql to restore the database
        const restoreCommand = `"${psqlPath}" -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -f "${tempFilePath}"`

        const { stdout, stderr } = await execPromise(restoreCommand, {
            env,
            maxBuffer: 50 * 1024 * 1024 // 50MB buffer
        })

        if (stderr && stderr.includes('ERROR')) {
            console.error('Restore stderr:', stderr)
        }

        return NextResponse.json({
            success: true,
            message: 'Database restored successfully'
        })

    } catch (error: any) {
        console.error('Restore error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to restore database'
            },
            { status: 500 }
        )
    } finally {
        // Clean up temp file
        if (tempFilePath) {
            try {
                await unlink(tempFilePath)
            } catch (e) {
                // Ignore cleanup errors
            }
        }
    }
}
