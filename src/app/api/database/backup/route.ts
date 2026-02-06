import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getPrisma } from '@/lib/prisma'

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

export async function GET() {
    try {
        // Verify admin role
        const session = await getServerSession(authOptions)
        if (!session?.user || (session.user as any).role !== 'admin') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
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
        const pgDumpPath = process.env.PG_DUMP_PATH || 'pg_dump'

        // Build pg_dump command
        const command = `"${pgDumpPath}" -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} --no-owner --no-acl`

        // Set PGPASSWORD environment variable
        const env = { ...process.env, PGPASSWORD: dbConfig.password }

        // Execute pg_dump
        const { stdout, stderr } = await execPromise(command, {
            env,
            maxBuffer: 50 * 1024 * 1024 // 50MB buffer
        })

        if (stderr && !stderr.includes('pg_dump:')) {
            console.error('pg_dump stderr:', stderr)
        }

        // Generate filename with timestamp
        const now = new Date()
        const timestamp = now.toISOString()
            .replace(/:/g, '-')
            .replace(/\./g, '-')
            .slice(0, 19)
        const filename = `backup_${timestamp}.sql`

        // Log activity
        try {
            await prisma.logAktivitas.create({
                data: {
                    userId: (session.user as any).id,
                    aksi: 'BACKUP_DATABASE',
                    tabel: 'database',
                    deskripsi: `Admin melakukan backup database: ${filename}`,
                }
            })
        } catch (logError) {
            console.error('Failed to log activity:', logError)
        }

        // Return SQL file as download
        return new NextResponse(stdout, {
            status: 200,
            headers: {
                'Content-Type': 'application/sql',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })

    } catch (error: any) {
        console.error('Backup error:', error)
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to create backup',
                details: error.stderr || undefined
            },
            { status: 500 }
        )
    }
}
