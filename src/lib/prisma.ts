import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Validate environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables')
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pool: Pool | undefined
}

// Create connection pool with error handling
const createPool = () => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  })

  // Add error handler to prevent crashing on connection issues
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err)
    // Don't exit process, just log error
  })

  return pool
}

const pool = globalForPrisma.pool ?? createPool()

// Create Prisma adapter
const adapter = new PrismaPg(pool)

// Create Prisma Client with adapter
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.pool = pool
}

export default prisma
