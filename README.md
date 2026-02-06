This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Instalasi Project

Ikuti langkah-langkah berikut untuk menjalankan project ini di komputer lokal Anda.

### 1. Persiapan Awal (Prerequisites)

Pastikan Anda telah menginstal:
- Node.js (versi 18 atau terbaru)
- PostgreSQL (database)
- Git

### 2. Instalasi Dependensi

Clone repository dan install dependensi yang dibutuhkan:

```bash
# Install dependencies
npm install
# atau
yarn install
# atau
pnpm install
# atau
bun install
```

### 3. Konfigurasi Database

1. Buat database baru di PostgreSQL (misalnya: `peminjaman_alat`).
2. Buat file `.env` dengan menyalin dari `.env.example`:
   ```bash
   cp .env.example .env
   ```
3. Sesuaikan variabel di dalam file `.env`:

   ```env
   # Koneksi Database Utama
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/peminjaman_alat?schema=public"
   
   # NextAuth Configuration
   NEXTAUTH_SECRET="buat-secret-random-panjang"
   NEXTAUTH_URL="http://localhost:3000"
   
   # Database Manager Configuration
   DB_MASTER_PASSWORD="master123"     # Master password untuk backup/restore/switch database
   
   # PostgreSQL Server Connection (untuk fitur Database Manager)
   POSTGRES_HOST="localhost"
   POSTGRES_PORT="5432"
   POSTGRES_USER="postgres"
   POSTGRES_PASSWORD="postgres"
   
   # Aktifkan fitur multi-database (true = tampilkan database selector di login)
   DB_LIST="true"
   ```

   > **Catatan:** 
   > - `DB_MASTER_PASSWORD` digunakan untuk mengamankan operasi database (backup, restore, ganti database)
   > - Set `DB_LIST="false"` jika tidak ingin menggunakan fitur multi-database

### 4. Migrasi Database & Seeding

Jalankan perintah berikut untuk membuat tabel dan mengisi data awal (termasuk akun admin):

```bash
# Generate Prisma Client
npm run db:generate

# Push schema ke database (untuk development)
npm run db:push

# Atau gunakan migrate untuk production/staging
# npm run db:migrate

# Seeding data awal (Admin, Petugas, User, Kategori, Alat)
npm run db:seed
```

### 5. Akun Administrator (Default)

Setelah menjalankan `npm run db:seed`, Anda dapat login menggunakan akun berikut:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@gmail.com` | `password123` |
| **Petugas** | `petugas1@gmail.com` | `password123` |
| **Peminjam** | `peminjam1@gmail.com` | `password123` |

> **Catatan:** Sebaiknya ubah password default setelah login pertama kali untuk keamanan.

## Database Manager

Fitur Database Manager memungkinkan Anda mengelola multiple database dalam satu instalasi aplikasi.

### Akses Database Manager

- Akses melalui halaman login, klik tombol **"Database Manager"** di pojok kanan atas
- Atau langsung akses URL: `http://localhost:3000/db-manager`
- Masukkan **Master Password** yang sudah dikonfigurasi di `.env` (`DB_MASTER_PASSWORD`)

### Fitur yang Tersedia

| Fitur | Deskripsi |
|-------|-----------|
| **Create Database** | Membuat database baru dengan admin account |
| **Backup Database** | Download backup database dalam format `.sql` |
| **Restore Database** | Restore database dari file backup `.sql` |
| **Duplicate Database** | Duplikasi database yang ada ke database baru |
| **Delete Database** | Hapus database yang tidak diperlukan |
| **Switch Database** | Ganti database aktif (memerlukan master password) |
| **Set Master Password** | Ubah master password untuk keamanan |

> **Keamanan:** Semua operasi database memerlukan verifikasi **Master Password** untuk mencegah akses tidak sah.

## Menjalankan Aplikasi

Jalankan development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
