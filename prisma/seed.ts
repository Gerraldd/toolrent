import 'dotenv/config'
import { PrismaClient, Role, UserStatus, AlatStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

    // ==========================================
    // SEED USERS
    // ==========================================
    console.log('👥 Creating users...')

    const admin = await prisma.user.create({
        data: {
            nama: 'Administrator',
            email: 'admin@gmail.com',
            password: hashedPassword,
            role: Role.admin,
            noTelepon: '081234567890',
            alamat: '',
            status: UserStatus.aktif,
        },
    })

    const petugas1 = await prisma.user.create({
        data: {
            nama: 'Ahmad Petugas',
            email: 'petugas1@gmail.com',
            password: hashedPassword,
            role: Role.petugas,
            noTelepon: '081234567891',
            alamat: '',
            status: UserStatus.aktif,
        },
    })

    const petugas2 = await prisma.user.create({
        data: {
            nama: 'Siti Rahayu',
            email: 'petugas2@gmail.com',
            password: hashedPassword,
            role: Role.petugas,
            noTelepon: '081234567892',
            alamat: '',
            status: UserStatus.aktif,
        },
    })

    const peminjam1 = await prisma.user.create({
        data: {
            nama: 'Budi Santoso',
            email: 'peminjam1@gmail.com',
            password: hashedPassword,
            role: Role.peminjam,
            noTelepon: '081234567893',
            alamat: '',
            status: UserStatus.aktif,
        },
    })

    const peminjam2 = await prisma.user.create({
        data: {
            nama: 'Citra Dewi',
            email: 'peminjam2@gmail.com',
            password: hashedPassword,
            role: Role.peminjam,
            noTelepon: '081234567894',
            alamat: '',
            status: UserStatus.aktif,
        },
    })

    const peminjam3 = await prisma.user.create({
        data: {
            nama: 'Dewi Anggraini',
            email: 'peminjam3@gmail.com',
            password: hashedPassword,
            role: Role.peminjam,
            noTelepon: '081234567895',
            alamat: '',
            status: UserStatus.aktif,
        },
    })

    console.log(`   ✅ Created ${await prisma.user.count()} users`)

    // ==========================================
    // SEED KATEGORI
    // ==========================================
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

    const kategoriKantor = await prisma.kategori.create({
        data: {
            nama: 'Peralatan Kantor',
            deskripsi: 'Peralatan kantor seperti printer, scanner',
        },
    })

    const kategoriOlahraga = await prisma.kategori.create({
        data: {
            nama: 'Olahraga',
            deskripsi: 'Peralatan olahraga seperti bola, raket, matras',
        },
    })

    console.log(`   ✅ Created ${await prisma.kategori.count()} categories`)

    // ==========================================
    // SEED ALAT
    // ==========================================
    console.log('🔧 Creating equipment...')

    const alatData = [
        // Elektronik
        { kode: 'LP-001', nama: 'Laptop HP Pavilion', kategoriId: kategoriElektronik.id, stokTotal: 5, stokTersedia: 5, kondisi: 'Baik', deskripsi: 'Laptop HP Pavilion 14 inch, Core i5, RAM 8GB' },
        { kode: 'LP-002', nama: 'Laptop Lenovo ThinkPad', kategoriId: kategoriElektronik.id, stokTotal: 3, stokTersedia: 3, kondisi: 'Baik', deskripsi: 'Laptop Lenovo ThinkPad 14 inch, Core i7, RAM 16GB' },
        { kode: 'KM-001', nama: 'Kamera Canon EOS 2000D', kategoriId: kategoriElektronik.id, stokTotal: 3, stokTersedia: 3, kondisi: 'Baik', deskripsi: 'Kamera DSLR Canon dengan lensa kit 18-55mm' },
        { kode: 'KM-002', nama: 'Kamera Sony Alpha A6000', kategoriId: kategoriElektronik.id, stokTotal: 2, stokTersedia: 2, kondisi: 'Baik', deskripsi: 'Kamera mirrorless Sony Alpha' },
        { kode: 'PY-001', nama: 'Proyektor Epson EB-X51', kategoriId: kategoriElektronik.id, stokTotal: 4, stokTersedia: 4, kondisi: 'Baik', deskripsi: 'Proyektor Epson 3800 lumens XGA' },
        { kode: 'PY-002', nama: 'Proyektor BenQ MS535', kategoriId: kategoriElektronik.id, stokTotal: 2, stokTersedia: 2, kondisi: 'Baik', deskripsi: 'Proyektor BenQ 3600 lumens' },

        // Audio Visual
        { kode: 'MC-001', nama: 'Mic Wireless Shure', kategoriId: kategoriAudioVisual.id, stokTotal: 8, stokTersedia: 8, kondisi: 'Baik', deskripsi: 'Mic wireless Shure professional' },
        { kode: 'MC-002', nama: 'Mic Condenser Audio Technica', kategoriId: kategoriAudioVisual.id, stokTotal: 4, stokTersedia: 4, kondisi: 'Baik', deskripsi: 'Mic condenser untuk recording dan podcast' },
        { kode: 'SP-001', nama: 'Speaker Aktif JBL EON615', kategoriId: kategoriAudioVisual.id, stokTotal: 4, stokTersedia: 4, kondisi: 'Baik', deskripsi: 'Speaker aktif JBL 1000W' },
        { kode: 'SP-002', nama: 'Speaker Portable Bose S1', kategoriId: kategoriAudioVisual.id, stokTotal: 3, stokTersedia: 3, kondisi: 'Baik', deskripsi: 'Speaker portable dengan battery' },
        { kode: 'MX-001', nama: 'Mixer Yamaha MG12XU', kategoriId: kategoriAudioVisual.id, stokTotal: 2, stokTersedia: 2, kondisi: 'Baik', deskripsi: 'Audio mixer 12 channel dengan USB' },
        { kode: 'TP-001', nama: 'Tripod Manfrotto', kategoriId: kategoriAudioVisual.id, stokTotal: 6, stokTersedia: 6, kondisi: 'Baik', deskripsi: 'Tripod professional untuk kamera' },

        // Peralatan Kantor
        { kode: 'PR-001', nama: 'Printer HP LaserJet', kategoriId: kategoriKantor.id, stokTotal: 3, stokTersedia: 3, kondisi: 'Baik', deskripsi: 'Printer laser hitam putih' },
        { kode: 'SC-001', nama: 'Scanner Epson V39', kategoriId: kategoriKantor.id, stokTotal: 2, stokTersedia: 2, kondisi: 'Baik', deskripsi: 'Scanner flatbed A4' },

        // Olahraga
        { kode: 'BL-001', nama: 'Bola Basket Molten', kategoriId: kategoriOlahraga.id, stokTotal: 10, stokTersedia: 10, kondisi: 'Baik', deskripsi: 'Bola basket official size 7' },
        { kode: 'BL-002', nama: 'Bola Voli Mikasa', kategoriId: kategoriOlahraga.id, stokTotal: 10, stokTersedia: 10, kondisi: 'Baik', deskripsi: 'Bola voli official' },
        { kode: 'RK-001', nama: 'Raket Badminton Yonex', kategoriId: kategoriOlahraga.id, stokTotal: 12, stokTersedia: 12, kondisi: 'Baik', deskripsi: 'Raket badminton dengan tas' },
        { kode: 'MT-001', nama: 'Matras Yoga', kategoriId: kategoriOlahraga.id, stokTotal: 15, stokTersedia: 15, kondisi: 'Baik', deskripsi: 'Matras yoga 6mm' },
    ]

    for (const alat of alatData) {
        await prisma.alat.create({
            data: {
                ...alat,
                status: AlatStatus.tersedia,
            },
        })
    }

    console.log(`   ✅ Created ${await prisma.alat.count()} equipment items`)

    // ==========================================
    // SEED SAMPLE PEMINJAMAN
    // ==========================================
    console.log('📋 Creating sample borrowings...')

    // Sample peminjaman yang sudah selesai
    const peminjaman1 = await prisma.peminjaman.create({
        data: {
            kode: 'PMJ-00001',
            userId: peminjam1.id,
            alatId: 1, // Laptop HP
            jumlah: 1,
            tanggalPinjam: new Date('2026-01-05'),
            tanggalKembaliRencana: new Date('2026-01-10'),
            keperluan: 'Presentasi proyek akhir',
            status: 'dikembalikan',
            validatedBy: petugas1.id,
            validatedAt: new Date('2026-01-05'),
            catatanValidasi: 'Disetujui untuk keperluan presentasi',
        },
    })

    // Pengembalian untuk peminjaman1
    await prisma.pengembalian.create({
        data: {
            peminjamanId: peminjaman1.id,
            tanggalKembaliAktual: new Date('2026-01-10'),
            hariTerlambat: 0,
            dendaPerHari: 5000,
            totalDenda: 0,
            kondisiAlat: 'baik',
            catatan: 'Dikembalikan dalam kondisi baik',
            processedBy: petugas1.id,
        },
    })

    // Sample peminjaman yang sedang berjalan
    await prisma.peminjaman.create({
        data: {
            kode: 'PMJ-00002',
            userId: peminjam2.id,
            alatId: 3, // Kamera Canon
            jumlah: 1,
            tanggalPinjam: new Date('2026-01-08'),
            tanggalKembaliRencana: new Date('2026-01-15'),
            keperluan: 'Dokumentasi kegiatan sekolah',
            status: 'dipinjam',
            validatedBy: petugas1.id,
            validatedAt: new Date('2026-01-08'),
            catatanValidasi: 'Disetujui',
        },
    })

    // Update stok alat untuk peminjaman yang sedang berjalan
    await prisma.alat.update({
        where: { id: 3 },
        data: { stokTersedia: 2 },
    })

    // Sample peminjaman yang menunggu persetujuan
    await prisma.peminjaman.create({
        data: {
            kode: 'PMJ-00003',
            userId: peminjam3.id,
            alatId: 5, // Proyektor Epson
            jumlah: 1,
            tanggalPinjam: new Date('2026-01-12'),
            tanggalKembaliRencana: new Date('2026-01-14'),
            keperluan: 'Seminar kelas',
            status: 'menunggu',
        },
    })

    console.log(`   ✅ Created ${await prisma.peminjaman.count()} borrowings`)

    // ==========================================
    // SEED LOG AKTIVITAS
    // ==========================================
    console.log('📝 Creating activity logs...')

    await prisma.logAktivitas.createMany({
        data: [
            {
                userId: admin.id,
                aksi: 'LOGIN',
                tabel: 'users',
                recordId: admin.id,
                deskripsi: 'Admin login ke sistem',
                ipAddress: '127.0.0.1',
            },
            {
                userId: petugas1.id,
                aksi: 'APPROVE',
                tabel: 'peminjaman',
                recordId: 1,
                deskripsi: 'Peminjaman PMJ-00001 disetujui',
                ipAddress: '127.0.0.1',
            },
            {
                userId: petugas1.id,
                aksi: 'RETURN',
                tabel: 'pengembalian',
                recordId: 1,
                deskripsi: 'Pengembalian PMJ-00001 diproses. Denda: Rp 0',
                ipAddress: '127.0.0.1',
            },
        ],
    })

    console.log(`   ✅ Created ${await prisma.logAktivitas.count()} activity logs`)

    console.log('')
    console.log('✨ Database seeding completed!')
    console.log('')
    console.log('📋 Summary:')
    console.log(`   - Users: ${await prisma.user.count()}`)
    console.log(`   - Categories: ${await prisma.kategori.count()}`)
    console.log(`   - Equipment: ${await prisma.alat.count()}`)
    console.log(`   - Borrowings: ${await prisma.peminjaman.count()}`)
    console.log(`   - Returns: ${await prisma.pengembalian.count()}`)
    console.log(`   - Activity Logs: ${await prisma.logAktivitas.count()}`)
    console.log('')
    console.log('🔐 Default credentials:')
    console.log('   Admin    : admin@gmail.com / password123')
    console.log('   Petugas  : petugas1@gmail.com / password123')
    console.log('   Peminjam : peminjam1@gmail.com / password123')
}

main()
    .catch((e) => {
        console.error('❌ Seeding error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
