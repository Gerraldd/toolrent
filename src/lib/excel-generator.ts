import * as XLSX from 'xlsx'

interface DateRange {
    start: string
    end: string
    kategori: string
}

// Helper to format date
const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    })
}

// Status label mapping
const statusLabels: Record<string, string> = {
    menunggu: 'Menunggu',
    disetujui: 'Disetujui',
    dipinjam: 'Dipinjam',
    ditolak: 'Ditolak',
    dikembalikan: 'Selesai',
    terlambat: 'Terlambat'
}

// Kondisi label mapping
const kondisiLabels: Record<string, string> = {
    baik: 'Baik',
    rusak_ringan: 'Rusak Ringan',
    rusak_berat: 'Rusak Berat',
    hilang: 'Hilang'
}

// Generate Peminjaman Excel
export async function generatePeminjamanExcel(data: any[], dateRange: DateRange): Promise<Uint8Array> {
    const workbook = XLSX.utils.book_new()

    // Header rows
    const headerRows = [
        ['LAPORAN PEMINJAMAN ALAT'],
        [`Periode: ${dateRange.start} - ${dateRange.end}`],
        [`Kategori: ${dateRange.kategori}`],
        [], // Empty row
        ['No', 'Kode', 'Peminjam', 'Email', 'Alat', 'Kode Alat', 'Qty', 'Tgl Pinjam', 'Tgl Kembali', 'Status', 'Keperluan']
    ]

    // Data rows
    const dataRows = data.map((item, index) => [
        index + 1,
        item.kode,
        item.user?.nama || '-',
        item.user?.email || '-',
        item.alat?.nama || '-',
        item.alat?.kode || '-',
        item.jumlah,
        formatDate(item.tanggalPinjam),
        formatDate(item.tanggalKembaliRencana),
        statusLabels[item.status] || item.status,
        item.keperluan || '-'
    ])

    // Summary rows
    const summaryRows = [
        [],
        [`Total Data: ${data.length} peminjaman`],
        [`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`]
    ]

    const allRows = [...headerRows, ...dataRows, ...summaryRows]

    const worksheet = XLSX.utils.aoa_to_sheet(allRows)

    // Set column widths
    worksheet['!cols'] = [
        { wch: 5 },   // No
        { wch: 18 },  // Kode
        { wch: 20 },  // Peminjam
        { wch: 25 },  // Email
        { wch: 25 },  // Alat
        { wch: 15 },  // Kode Alat
        { wch: 5 },   // Qty
        { wch: 15 },  // Tgl Pinjam
        { wch: 15 },  // Tgl Kembali
        { wch: 12 },  // Status
        { wch: 40 },  // Keperluan
    ]

    // Merge title cells
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Peminjaman')

    return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }))
}

// Generate Pengembalian Excel
export async function generatePengembalianExcel(data: any[], dateRange: DateRange): Promise<Uint8Array> {
    const workbook = XLSX.utils.book_new()

    // Header rows
    const headerRows = [
        ['LAPORAN PENGEMBALIAN ALAT'],
        [`Periode: ${dateRange.start} - ${dateRange.end}`],
        [`Kategori: ${dateRange.kategori}`],
        [],
        ['No', 'Kode Pinjam', 'Peminjam', 'Email', 'Alat', 'Tgl Pinjam', 'Tgl Kembali', 'Terlambat', 'Denda', 'Kondisi', 'Diproses Oleh']
    ]

    // Data rows
    const dataRows = data.map((item, index) => [
        index + 1,
        item.peminjaman?.kode || '-',
        item.peminjaman?.user?.nama || '-',
        item.peminjaman?.user?.email || '-',
        item.peminjaman?.alat?.nama || '-',
        formatDate(item.peminjaman?.tanggalPinjam),
        formatDate(item.tanggalKembaliAktual),
        item.hariTerlambat > 0 ? `${item.hariTerlambat} hari` : 'Tepat',
        Number(item.totalDenda),
        kondisiLabels[item.kondisiAlat] || item.kondisiAlat,
        item.processor?.nama || '-'
    ])

    // Summary rows
    const totalDenda = data.reduce((sum, item) => sum + Number(item.totalDenda), 0)
    const summaryRows = [
        [],
        [`Total Data: ${data.length} pengembalian`],
        [`Total Denda: Rp ${totalDenda.toLocaleString('id-ID')}`],
        [`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`]
    ]

    const allRows = [...headerRows, ...dataRows, ...summaryRows]

    const worksheet = XLSX.utils.aoa_to_sheet(allRows)

    // Set column widths
    worksheet['!cols'] = [
        { wch: 5 },   // No
        { wch: 18 },  // Kode
        { wch: 20 },  // Peminjam
        { wch: 25 },  // Email
        { wch: 25 },  // Alat
        { wch: 15 },  // Tgl Pinjam
        { wch: 15 },  // Tgl Kembali
        { wch: 12 },  // Terlambat
        { wch: 15 },  // Denda
        { wch: 15 },  // Kondisi
        { wch: 20 },  // Diproses Oleh
    ]

    // Merge title cells
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pengembalian')

    return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }))
}

// Generate Denda Excel
export async function generateDendaExcel(data: any[], dateRange: DateRange): Promise<Uint8Array> {
    const workbook = XLSX.utils.book_new()

    // Header rows
    const headerRows = [
        ['LAPORAN DENDA & KETERLAMBATAN'],
        [`Periode: ${dateRange.start} - ${dateRange.end}`],
        [`Kategori: ${dateRange.kategori}`],
        [],
        ['No', 'Kode Pinjam', 'Peminjam', 'Email', 'Alat', 'Jatuh Tempo', 'Dikembalikan', 'Hari Terlambat', 'Denda/Hari', 'Total Denda']
    ]

    // Data rows
    const dataRows = data.map((item, index) => [
        index + 1,
        item.peminjaman?.kode || '-',
        item.peminjaman?.user?.nama || '-',
        item.peminjaman?.user?.email || '-',
        item.peminjaman?.alat?.nama || '-',
        formatDate(item.peminjaman?.tanggalKembaliRencana),
        formatDate(item.tanggalKembaliAktual),
        item.hariTerlambat,
        Number(item.dendaPerHari),
        Number(item.totalDenda)
    ])

    // Summary rows
    const totalDenda = data.reduce((sum, item) => sum + Number(item.totalDenda), 0)
    const totalHari = data.reduce((sum, item) => sum + item.hariTerlambat, 0)
    const summaryRows = [
        [],
        [`Total Kasus: ${data.length} keterlambatan`],
        [`Total Hari Terlambat: ${totalHari} hari`],
        [`Total Denda: Rp ${totalDenda.toLocaleString('id-ID')}`],
        [`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`]
    ]

    const allRows = [...headerRows, ...dataRows, ...summaryRows]

    const worksheet = XLSX.utils.aoa_to_sheet(allRows)

    // Set column widths
    worksheet['!cols'] = [
        { wch: 5 },   // No
        { wch: 18 },  // Kode
        { wch: 20 },  // Peminjam
        { wch: 25 },  // Email
        { wch: 25 },  // Alat
        { wch: 15 },  // Jatuh Tempo
        { wch: 15 },  // Dikembalikan
        { wch: 15 },  // Hari Terlambat
        { wch: 15 },  // Denda/Hari
        { wch: 15 },  // Total Denda
    ]

    // Merge title cells
    worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Denda')

    return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }))
}
