import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const dbName = searchParams.get('database')
    const masterPassword = searchParams.get('masterPassword')

    if (!dbName) {
        return NextResponse.json({
            success: false,
            error: 'Database name is required'
        }, { status: 400 })
    }

    // Validate master password
    const storedMasterPassword = process.env.DB_MASTER_PASSWORD
    if (!masterPassword || masterPassword !== storedMasterPassword) {
        return NextResponse.json({
            success: false,
            error: 'Invalid master password'
        }, { status: 401 })
    }

    try {
        const pgDumpPath = process.env.PG_DUMP_PATH || 'pg_dump'
        const host = process.env.POSTGRES_HOST || 'localhost'
        const port = process.env.POSTGRES_PORT || '5432'
        const user = process.env.POSTGRES_USER || 'postgres'
        const password = process.env.POSTGRES_PASSWORD || 'postgres'

        // Build pg_dump command
        const command = `"${pgDumpPath}" -h ${host} -p ${port} -U ${user} -d "${dbName}" --no-owner --no-acl`

        // Set PGPASSWORD environment variable
        const env = {
            ...process.env,
            PGPASSWORD: password
        }

        const { stdout, stderr } = await execPromise(command, {
            env,
            maxBuffer: 100 * 1024 * 1024 // 100MB buffer
        })

        if (stderr && !stderr.includes('Warning')) {
            console.error('pg_dump stderr:', stderr)
        }

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const filename = `${dbName}_backup_${timestamp}.sql`

        // Return the SQL dump as a downloadable file
        return new NextResponse(stdout, {
            status: 200,
            headers: {
                'Content-Type': 'application/sql',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    } catch (error: any) {
        console.error('Backup error:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to backup database'
        }, { status: 500 })
    }
}
