// Simple seed script for Prisma 7
require('dotenv').config()
const { PrismaClient, Role, UserStatus, AlatStatus } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seeding...')

    // Clear existing data
    console.log('🗑️  Clearing existing data...')
    await prisma.logAktivitas.deleteMany()
    await prisma.pengembalian.deleteMany()
    await prisma.peminjaman.deleteMany()
    await prisma.alat.deleteMany()
    await prisma.kategori.deleteMany()
    await prisma.user.deleteMany()

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10)

    // Create admin user
    console.log('👥 Creating users...')
    const admin = await prisma.user.create({
        data: {
            nama: 'Administrator',
            email: 'admin@sekolah.id',
            password: hashedPassword,
            role: 'admin',
            noTelepon: '081234567890',
            alamat: 'SMK Negeri 1 Jenangan Ponorogo',
            status: 'aktif',
        },
    })

    const petugas1 = await prisma.user.create({
        data: {
            nama: 'Ahmad Petugas',
            email: 'ahmad@sekolah.id',
            password: hashedPassword,
            role: 'petugas',
            noTelepon: '081234567891',
            alamat: 'Ponorogo',
            status: 'aktif',
        },
    })

    const peminjam1 = await prisma.user.create({
        data: {
            nama: 'Budi Santoso',
            email: 'budi@siswa.id',
            password: hashedPassword,
            role: 'peminjam',
            noTelepon: '081234567893',
            alamat: 'Ponorogo',
            status: 'aktif',
        },
    })

    console.log(`   ✅ Created ${await prisma.user.count()} users`)

    // Create categories
    console.log('📁 Creating categories...')
    const kategoriElektronik = await prisma.kategori.create({
        data: {
            nama: 'Elektronik',
            deskripsi: 'Peralatan elektronik seperti laptop, kamera, proyektor',
        },
    })

    const kategoriAudioVisual = await prisma.kategori.create({
        data: {
            nama: 'Audio Visual',
            deskripsi: 'Peralatan audio visual seperti speaker, mic, mixer',
        },
    })

    console.log(`   ✅ Created ${await prisma.kategori.count()} categories`)

    // Create equipment
    console.log('🔧 Creating equipment...')
    await prisma.alat.create({
        data: {
            kode: 'LP-001',
            nama: 'Laptop HP Pavilion',
            kategoriId: kategoriElektronik.id,
            stokTotal: 5,
            stokTersedia: 5,
            kondisi: 'Baik',
            deskripsi: 'Laptop HP Pavilion 14 inch, Core i5, RAM 8GB',
            status: 'tersedia',
        },
    })

    await prisma.alat.create({
        data: {
            kode: 'KM-001',
            nama: 'Kamera Canon EOS 2000D',
            kategoriId: kategoriElektronik.id,
            stokTotal: 3,
            stokTersedia: 3,
            kondisi: 'Baik',
            deskripsi: 'Kamera DSLR Canon dengan lensa kit 18-55mm',
            status: 'tersedia',
        },
    })

    await prisma.alat.create({
        data: {
            kode: 'MC-001',
            nama: 'Mic Wireless Shure',
            kategoriId: kategoriAudioVisual.id,
            stokTotal: 8,
            stokTersedia: 8,
            kondisi: 'Baik',
            deskripsi: 'Mic wireless Shure professional',
            status: 'tersedia',
        },
    })

    console.log(`   ✅ Created ${await prisma.alat.count()} equipment items`)

    console.log('')
    console.log('✨ Database seeding completed!')
    console.log('')
    console.log('🔐 Default credentials:')
    console.log('   Admin    : admin@sekolah.id / password123')
    console.log('   Petugas  : ahmad@sekolah.id / password123')
    console.log('   Peminjam : budi@siswa.id / password123')
}

main()
    .catch((e) => {
        console.error('❌ Seeding error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
