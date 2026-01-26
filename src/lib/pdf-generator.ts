import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount)
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

// Common PDF header - Simple black and white official document style
function addPDFHeader(doc: jsPDF, title: string, dateRange: DateRange) {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Report title - black text, no background
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(title.toUpperCase(), pageWidth / 2, 18, { align: 'center' })

    // Subtitle line
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.line(14, 24, pageWidth - 14, 24)

    // Date range
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Periode: ${dateRange.start} - ${dateRange.end}`, pageWidth / 2, 32, { align: 'center' })

    // Kategori
    doc.text(`Kategori: ${dateRange.kategori}`, pageWidth / 2, 40, { align: 'center' })
}

// Common PDF footer
function addPDFFooter(doc: jsPDF) {
    const pageCount = (doc as any).internal.getNumberOfPages()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(9)
        doc.setTextColor(128, 128, 128)

        // Print date
        const printDate = new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
        doc.text(`Dicetak: ${printDate}`, 14, pageHeight - 10)

        // Page number
        doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' })
    }
}

// Generate Peminjaman PDF
export async function generatePeminjamanPDF(data: any[], dateRange: DateRange): Promise<Uint8Array> {
    const doc = new jsPDF('landscape')

    addPDFHeader(doc, 'Laporan Peminjaman Alat', dateRange)

    // Table data
    const tableData = data.map((item, index) => [
        index + 1,
        item.kode,
        item.user?.nama || '-',
        item.alat?.nama || '-',
        item.jumlah,
        formatDate(item.tanggalPinjam),
        formatDate(item.tanggalKembaliRencana),
        statusLabels[item.status] || item.status,
        item.keperluan || '-'
    ])

    autoTable(doc, {
        head: [['No', 'Kode', 'Peminjam', 'Alat', 'Qty', 'Tgl Pinjam', 'Tgl Kembali', 'Status', 'Keperluan']],
        body: tableData,
        startY: 50,
        theme: 'grid',
        headStyles: {
            fillColor: [80, 80, 80],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { halign: 'center', cellWidth: 28 },
            4: { halign: 'center', cellWidth: 15 },
            5: { halign: 'center', cellWidth: 28 },
            6: { halign: 'center', cellWidth: 28 },
            7: { halign: 'center', cellWidth: 25 }
        }
    })

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total Data: ${data.length} peminjaman`, 14, finalY)

    addPDFFooter(doc)

    return new Uint8Array(doc.output('arraybuffer'))
}

// Generate Pengembalian PDF
export async function generatePengembalianPDF(data: any[], dateRange: DateRange): Promise<Uint8Array> {
    const doc = new jsPDF('landscape')

    addPDFHeader(doc, 'Laporan Pengembalian Alat', dateRange)

    // Table data
    const tableData = data.map((item, index) => [
        index + 1,
        item.peminjaman?.kode || '-',
        item.peminjaman?.user?.nama || '-',
        item.peminjaman?.alat?.nama || '-',
        formatDate(item.tanggalKembaliAktual),
        item.hariTerlambat > 0 ? `${item.hariTerlambat} hari` : 'Tepat',
        formatCurrency(Number(item.totalDenda)),
        kondisiLabels[item.kondisiAlat] || item.kondisiAlat,
        item.processor?.nama || '-'
    ])

    autoTable(doc, {
        head: [['No', 'Kode', 'Peminjam', 'Alat', 'Tgl Kembali', 'Terlambat', 'Denda', 'Kondisi', 'Diproses']],
        body: tableData,
        startY: 50,
        theme: 'grid',
        headStyles: {
            fillColor: [80, 80, 80],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { halign: 'center', cellWidth: 28 },
            4: { halign: 'center', cellWidth: 28 },
            5: { halign: 'center', cellWidth: 22 },
            6: { halign: 'right', cellWidth: 30 },
            7: { halign: 'center', cellWidth: 25 }
        }
    })

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10
    const totalDenda = data.reduce((sum, item) => sum + Number(item.totalDenda), 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total Data: ${data.length} pengembalian`, 14, finalY)
    doc.text(`Total Denda: ${formatCurrency(totalDenda)}`, 14, finalY + 6)

    addPDFFooter(doc)

    return new Uint8Array(doc.output('arraybuffer'))
}

// Generate Denda PDF
export async function generateDendaPDF(data: any[], dateRange: DateRange): Promise<Uint8Array> {
    const doc = new jsPDF('landscape')

    addPDFHeader(doc, 'Laporan Denda & Keterlambatan', dateRange)

    // Table data
    const tableData = data.map((item, index) => [
        index + 1,
        item.peminjaman?.kode || '-',
        item.peminjaman?.user?.nama || '-',
        item.peminjaman?.alat?.nama || '-',
        formatDate(item.peminjaman?.tanggalKembaliRencana),
        formatDate(item.tanggalKembaliAktual),
        `${item.hariTerlambat} hari`,
        formatCurrency(Number(item.dendaPerHari)),
        formatCurrency(Number(item.totalDenda))
    ])

    autoTable(doc, {
        head: [['No', 'Kode', 'Peminjam', 'Alat', 'Jatuh Tempo', 'Dikembalikan', 'Terlambat', 'Denda/Hari', 'Total Denda']],
        body: tableData,
        startY: 50,
        theme: 'grid',
        headStyles: {
            fillColor: [80, 80, 80],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center'
        },
        styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.1
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { halign: 'center', cellWidth: 28 },
            4: { halign: 'center', cellWidth: 28 },
            5: { halign: 'center', cellWidth: 28 },
            6: { halign: 'center', cellWidth: 22 },
            7: { halign: 'right', cellWidth: 28 },
            8: { halign: 'right', cellWidth: 30 }
        }
    })

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10
    const totalDenda = data.reduce((sum, item) => sum + Number(item.totalDenda), 0)
    const totalHari = data.reduce((sum, item) => sum + item.hariTerlambat, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total Kasus: ${data.length} keterlambatan`, 14, finalY)
    doc.text(`Total Hari Terlambat: ${totalHari} hari`, 14, finalY + 6)
    doc.setTextColor(0, 0, 0)
    doc.text(`Total Denda: ${formatCurrency(totalDenda)}`, 14, finalY + 12)

    addPDFFooter(doc)

    return new Uint8Array(doc.output('arraybuffer'))
}
