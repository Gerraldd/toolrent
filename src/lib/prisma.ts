import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { cookies } from 'next/headers'

// Validate environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables')
}

// Parse base connection info from DATABASE_URL
function parseConnectionUrl(url: string) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/)
  if (!match) {
    return null
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5]
  }
}

const baseConfig = parseConnectionUrl(process.env.DATABASE_URL!)

// Get dynamic database URL based on selected database
export function getDatabaseUrl(selectedDatabase?: string): string {
  if (!baseConfig) {
    return process.env.DATABASE_URL!
  }

  const dbName = selectedDatabase || baseConfig.database
  return `postgresql://${baseConfig.user}:${baseConfig.password}@${baseConfig.host}:${baseConfig.port}/${dbName}?schema=public`
}

// Cache for pools and clients by database name
const poolCache = new Map<string, Pool>()
const prismaCache = new Map<string, PrismaClient>()

// Create connection pool with error handling
const createPool = (databaseUrl: string) => {
  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
  })

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err)
  })

  return pool
}

// Get Prisma client for a specific database
export function getPrismaClient(databaseName?: string): PrismaClient {
  const dbName = databaseName || (baseConfig?.database || 'peminjaman-alat')

  if (prismaCache.has(dbName)) {
    return prismaCache.get(dbName)!
  }

  const databaseUrl = getDatabaseUrl(dbName)

  let pool = poolCache.get(dbName)
  if (!pool) {
    pool = createPool(databaseUrl)
    poolCache.set(dbName, pool)
  }

  const adapter = new PrismaPg(pool)
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

  prismaCache.set(dbName, client)
  return client
}

// Get Prisma client based on selected database cookie - USE THIS IN API ROUTES
export async function getPrisma(): Promise<PrismaClient> {
  try {
    const cookieStore = await cookies()
    const selectedDb = cookieStore.get('selected_database')?.value
    return getPrismaClient(selectedDb)
  } catch {
    // If cookies() fails (e.g., during build), use default
    return getPrismaClient()
  }
}

// Default export for backward compatibility - uses default database from .env
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

const defaultPool = globalForPrisma.pool ?? createPool(process.env.DATABASE_URL!)
const adapter = new PrismaPg(defaultPool)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.pool = defaultPool
}

export default prisma
