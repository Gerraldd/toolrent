'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Plus,
    Search,
    Filter,
    Download,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Wrench,
    Loader2,
    UploadCloud,
    Settings,
    Upload,
    FileText,
    FileSpreadsheet,
    CheckCircle,
    FileUp,
    AlertTriangle,
    X
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useAlat, useCreateAlat, useUpdateAlat, useDeleteAlat } from '@/hooks/use-alat'
import { useKategori } from '@/hooks/use-kategori'
import { Alat, CreateAlatInput, UpdateAlatInput } from '@/lib/api-client'
import { useLanguage } from '@/contexts/language-context'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'


export default function AlatPage() {
    const { t, language } = useLanguage()
    // State for search and filters

    const [searchValue, setSearchValue] = useState('')
    const [kategoriFilter, setKategoriFilter] = useState('')
    const [kondisiFilter, setKondisiFilter] = useState('')

    // Dialog states
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
    const [editingAlat, setEditingAlat] = useState<Alat | null>(null)
    const [deletingAlat, setDeletingAlat] = useState<Alat | null>(null)

    // Import states
    const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importFileHeaders, setImportFileHeaders] = useState<string[]>([])
    const [importFileData, setImportFileData] = useState<Record<string, string>[]>([])
    const [columnMapping, setColumnMapping] = useState<{
        nama: string
        kode: string
        kategori: string
        deskripsi: string
        stokTotal: string
        kondisi: string
        status: string
    }>({ nama: '', kode: '', kategori: '', deskripsi: '', stokTotal: '', kondisi: '', status: '' })
    const [importing, setImporting] = useState(false)
    const [duplicateRows, setDuplicateRows] = useState<{ row: number; nama: string }[]>([])
    const [checkingDuplicates, setCheckingDuplicates] = useState(false)

    // Form states for Add Alat
    const [addForm, setAddForm] = useState<CreateAlatInput>({
        kode: '',
        nama: '',
        kategoriId: undefined,
        deskripsi: '',
        stokTotal: 1,
        kondisi: 'Baik',
        status: 'tersedia'
    })
    const [addPhotoFile, setAddPhotoFile] = useState<File | null>(null)
    const [addPhotoPreview, setAddPhotoPreview] = useState<string>('')

    // Form states for Edit Alat
    const [editForm, setEditForm] = useState<UpdateAlatInput>({})
    const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
    const [editPhotoPreview, setEditPhotoPreview] = useState<string>('')
    const [uploading, setUploading] = useState(false)

    // Use hooks
    const {
        alat,
        loading,
        pagination,
        refetch,
        setPage,
        setSearch,
        setKategoriFilter: setKategoriFilterHook,
        setStatusFilter
    } = useAlat()

    const { kategori: kategoriList } = useKategori()

    const { createAlat, loading: creating } = useCreateAlat(() => {
        setIsAddDialogOpen(false)
        resetAddForm()
        refetch()
    })

    const { updateAlat, loading: updating } = useUpdateAlat(() => {
        setEditingAlat(null)
        refetch()
    })

    const { deleteAlat, loading: deleting } = useDeleteAlat(() => {
        setDeletingAlat(null)
        refetch()
    })

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchValue)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchValue, setSearch])

    // Apply filters
    useEffect(() => {
        setKategoriFilterHook(kategoriFilter)
    }, [kategoriFilter, setKategoriFilterHook])

    useEffect(() => {
        // Convert kondisi filter to status filter for API
        if (kondisiFilter === 'BAIK' || kondisiFilter === 'RUSAK_RINGAN' || kondisiFilter === 'RUSAK_BERAT') {
            // Kondisi is not a status filter, we'll handle this differently
            // For now, we'll just use statusFilter for availability status
        }
        setStatusFilter(kondisiFilter === 'tersedia' || kondisiFilter === 'habis' || kondisiFilter === 'maintenance' ? kondisiFilter : '')
    }, [kondisiFilter, setStatusFilter])

    // Reset add form
    const resetAddForm = () => {
        setAddForm({
            kode: '',
            nama: '',
            kategoriId: undefined,
            deskripsi: '',
            stokTotal: 1,
            kondisi: 'Baik',
            status: 'tersedia'
        })
        setAddPhotoFile(null)
        setAddPhotoPreview('')
    }

    // Available export columns
    const exportColumns = [
        { key: 'no', label: 'No' },
        { key: 'kode', label: 'Kode' },
        { key: 'nama', label: 'Nama' },
        { key: 'kategori', label: 'Kategori' },
        { key: 'status', label: 'Status' },
        { key: 'stokTotal', label: 'Stok Total' },
        { key: 'stokTersedia', label: 'Stok Tersedia' }
    ]

    // State for selected export columns
    const [selectedColumns, setSelectedColumns] = useState<string[]>(['no', 'kode', 'nama', 'kategori', 'status', 'stokTotal', 'stokTersedia'])

    // Toggle column selection
    const toggleColumn = (key: string) => {
        setSelectedColumns(prev =>
            prev.includes(key)
                ? prev.filter(k => k !== key)
                : [...prev, key]
        )
    }

    // Select all columns
    const selectAllColumns = () => {
        setSelectedColumns(exportColumns.map(c => c.key))
    }

    // Deselect all columns
    const deselectAllColumns = () => {
        setSelectedColumns([])
    }

    // Export handlers
    const handleExportCSV = () => {
        if (selectedColumns.length === 0) return

        const headers = exportColumns
            .filter(c => selectedColumns.includes(c.key))
            .map(c => c.label)

        const rows = alat.map((item, index) => {
            const row: (string | number)[] = []
            if (selectedColumns.includes('no')) row.push(index + 1)
            if (selectedColumns.includes('kode')) row.push(item.kode)
            if (selectedColumns.includes('nama')) row.push(item.nama)
            if (selectedColumns.includes('kategori')) row.push(item.kategori?.nama || '-')
            if (selectedColumns.includes('kondisi')) row.push(item.kondisi)
            if (selectedColumns.includes('status')) row.push(item.status)
            if (selectedColumns.includes('stokTotal')) row.push(item.stokTotal)
            if (selectedColumns.includes('stokTersedia')) row.push(item.stokTersedia)
            return row
        })

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `Data_Alat_${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        setIsExportDialogOpen(false)
    }

    const handleExportExcel = () => {
        if (selectedColumns.length === 0) return

        const data = alat.map((item, index) => {
            const row: Record<string, string | number> = {}
            if (selectedColumns.includes('no')) row['No'] = index + 1
            if (selectedColumns.includes('kode')) row['Kode'] = item.kode
            if (selectedColumns.includes('nama')) row['Nama'] = item.nama
            if (selectedColumns.includes('kategori')) row['Kategori'] = item.kategori?.nama || '-'
            if (selectedColumns.includes('kondisi')) row['Kondisi'] = item.kondisi
            if (selectedColumns.includes('status')) row['Status'] = item.status
            if (selectedColumns.includes('stokTotal')) row['Stok Total'] = item.stokTotal
            if (selectedColumns.includes('stokTersedia')) row['Stok Tersedia'] = item.stokTersedia
            return row
        })

        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Alat')
        XLSX.writeFile(workbook, `Data_Alat_${new Date().toISOString().split('T')[0]}.xlsx`)
        setIsExportDialogOpen(false)
    }

    // Import handlers
    const resetImport = () => {
        setImportStep('upload')
        setImportFile(null)
        setImportFileHeaders([])
        setImportFileData([])
        setColumnMapping({ nama: '', kode: '', kategori: '', deskripsi: '', stokTotal: '', kondisi: '', status: '' })
        setDuplicateRows([])
    }


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImportFile(file)
        const reader = new FileReader()

        reader.onload = (evt) => {
            try {
                const data = evt.target?.result
                const workbook = XLSX.read(data, { type: 'binary' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 })

                if (jsonData.length < 2) {
                    toast.error('File harus memiliki minimal 1 baris header dan 1 baris data')
                    return
                }

                const headers = (jsonData[0] as unknown[]).map(h => String(h || '').trim())
                const rows = jsonData.slice(1).map(row => {
                    const obj: Record<string, string> = {}
                    headers.forEach((header, idx) => {
                        obj[header] = String((row as unknown[])[idx] || '').trim()
                    })
                    return obj
                }).filter(row => Object.values(row).some(v => v !== ''))

                setImportFileHeaders(headers)
                setImportFileData(rows)

                // Auto-detect mapping
                const namaMatch = headers.find(h =>
                    h.toLowerCase().includes('nama') ||
                    h.toLowerCase().includes('name')
                )
                const kodeMatch = headers.find(h =>
                    h.toLowerCase().includes('kode') ||
                    h.toLowerCase().includes('code')
                )
                const kategoriMatch = headers.find(h =>
                    h.toLowerCase().includes('kategori') ||
                    h.toLowerCase().includes('category')
                )
                const deskripsiMatch = headers.find(h =>
                    h.toLowerCase().includes('deskripsi') ||
                    h.toLowerCase().includes('description') ||
                    h.toLowerCase().includes('keterangan')
                )
                const stokMatch = headers.find(h =>
                    h.toLowerCase().includes('stok') ||
                    h.toLowerCase().includes('stock') ||
                    h.toLowerCase().includes('jumlah')
                )
                const kondisiMatch = headers.find(h =>
                    h.toLowerCase().includes('kondisi') ||
                    h.toLowerCase().includes('condition')
                )
                const statusMatch = headers.find(h =>
                    h.toLowerCase().includes('status')
                )

                setColumnMapping({
                    nama: namaMatch || '',
                    kode: kodeMatch || '',
                    kategori: kategoriMatch || '',
                    deskripsi: deskripsiMatch || '',
                    stokTotal: stokMatch || '',
                    kondisi: kondisiMatch || '',
                    status: statusMatch || ''
                })

                setImportStep('mapping')
                toast.success(`File berhasil dibaca: ${rows.length} baris data`)
            } catch (error) {
                console.error('Error parsing file:', error)
                toast.error('Gagal membaca file. Pastikan format file valid.')
            }
        }

        reader.readAsBinaryString(file)
    }

    const handleImportSubmit = async () => {
        if (!columnMapping.nama) {
            return
        }

        setImporting(true)
        setDuplicateRows([]) // Reset duplicates

        try {
            // Check for duplicates first
            const existingNames = new Set(alat.map(a => a.nama.toLowerCase()))
            const duplicates: { row: number; nama: string }[] = []
            const seenNames = new Set<string>()

            importFileData.forEach((row, index) => {
                const nama = row[columnMapping.nama]?.trim()
                if (nama) {
                    const namaLower = nama.toLowerCase()
                    if (existingNames.has(namaLower) || seenNames.has(namaLower)) {
                        duplicates.push({ row: index + 1, nama })
                    }
                    seenNames.add(namaLower)
                }
            })

            // If duplicates found, block import and show error in modal
            if (duplicates.length > 0) {
                setDuplicateRows(duplicates)
                setImporting(false)
                return
            }

            const importData = importFileData.map(row => ({
                nama: row[columnMapping.nama] || '',
                kode: columnMapping.kode ? row[columnMapping.kode] : '',
                kategori: columnMapping.kategori ? row[columnMapping.kategori] : '',
                deskripsi: columnMapping.deskripsi ? row[columnMapping.deskripsi] : '',
                stokTotal: columnMapping.stokTotal ? row[columnMapping.stokTotal] : '',
                kondisi: columnMapping.kondisi ? row[columnMapping.kondisi] : '',
                status: columnMapping.status ? row[columnMapping.status] : ''
            })).filter(item => item.nama.trim() !== '')

            if (importData.length === 0) {
                setImporting(false)
                return
            }

            const res = await fetch('/api/alat/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: importData })
            })

            const result = await res.json()

            if (result.success) {
                toast.success(`${importFileData.length} data berhasil diimport`)
                setIsImportDialogOpen(false)
                resetImport()
                refetch()
            } else {
                // Show error from API in duplicateRows format if it's a duplicate error
                if (result.duplicates && result.duplicates.length > 0) {
                    setDuplicateRows(result.duplicates.map((name: string, idx: number) => ({ row: idx + 1, nama: name })))
                }
            }
        } catch (error) {
            console.error('Import error:', error)
        } finally {
            setImporting(false)
        }
    }

    // Upload photo helper
    const uploadPhoto = async (file: File): Promise<string | null> => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'alat')

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            const result = await response.json()
            if (result.success) {
                return result.data.url
            }
            return null
        } catch {
            return null
        }
    }

    // Handle photo file change for Add
    const handleAddPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAddPhotoFile(file)
            setAddPhotoPreview(URL.createObjectURL(file))
        }
    }

    // Handle photo file change for Edit
    const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setEditPhotoFile(file)
            setEditPhotoPreview(URL.createObjectURL(file))
        }
    }

    // Handle add alat submit
    const handleAddAlat = async () => {
        if (!addForm.kode || !addForm.nama) {
            return
        }

        setUploading(true)
        let gambarUrl = addForm.gambar

        // Upload photo if selected
        if (addPhotoFile) {
            const uploadedUrl = await uploadPhoto(addPhotoFile)
            if (uploadedUrl) {
                gambarUrl = uploadedUrl
            }
        }

        await createAlat({ ...addForm, gambar: gambarUrl })
        setUploading(false)
    }

    // Handle edit alat
    const handleEditClick = (item: Alat) => {
        setEditingAlat(item)
        setEditForm({
            kode: item.kode,
            nama: item.nama,
            kategoriId: item.kategoriId || undefined,
            deskripsi: item.deskripsi || '',
            stokTotal: item.stokTotal,
            stokTersedia: item.stokTersedia,
            stokPerbaikan: item.stokPerbaikan || 0,
            kondisi: item.kondisi,
            status: item.status,
            gambar: item.gambar || ''
        })
        setEditPhotoFile(null)
        setEditPhotoPreview(item.gambar || '')
    }

    // Handle update alat submit
    const handleUpdateAlat = async () => {
        if (!editingAlat) return

        // Validation: Stok tersedia + Stok perbaikan cannot exceed stok total
        if ((editForm.stokTersedia || 0) + (editForm.stokPerbaikan || 0) > (editForm.stokTotal || 0)) {
            toast.error('Jumlah Stok Tersedia dan Dalam Perbaikan tidak boleh melebihi Stok Total')
            return
        }

        setUploading(true)
        let gambarUrl = editForm.gambar

        // Upload photo if new file selected
        if (editPhotoFile) {
            const uploadedUrl = await uploadPhoto(editPhotoFile)
            if (uploadedUrl) {
                gambarUrl = uploadedUrl
            }
        }

        await updateAlat(editingAlat.id, { ...editForm, gambar: gambarUrl })
        setUploading(false)
    }

    // Handle delete alat
    const handleDeleteAlat = async () => {
        if (!deletingAlat) return
        await deleteAlat(deletingAlat.id)
    }

    // Get kondisi badge
    const getKondisiBadge = (kondisi: string) => {
        const kondisiLower = kondisi.toLowerCase()
        if (kondisiLower === 'baik' || kondisi === 'BAIK') {
            return (
                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {t('tools.condition.good')}
                </span>
            )
        }
        if (kondisiLower === 'rusak') {
            return (
                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                    {t('tools.condition.damaged')}
                </span>
            )
        }
        if (kondisiLower === 'hilang') {
            return (
                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
                    {t('tools.condition.lost')}
                </span>
            )
        }
        return (
            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                {kondisi}
            </span>
        )
    }

    // Get status badge
    const getStatusBadge = (status: string) => {
        const statusLower = status.toLowerCase()
        if (statusLower === 'tersedia') {
            return (
                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {t('tools.status.available')}
                </span>
            )
        }
        if (statusLower === 'habis') {
            return (
                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">
                    {t('tools.status.outOfStock')}
                </span>
            )
        }
        if (statusLower === 'maintenance') {
            return (
                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {t('tools.status.maintenance')}
                </span>
            )
        }
        return (
            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                {status}
            </span>
        )
    }

    // Generate pagination buttons
    const renderPaginationButtons = () => {
        const { page, totalPages } = pagination
        const buttons = []

        buttons.push(
            <Button
                key="prev"
                variant="outline"
                size="icon"
                className="w-9 h-9 border-slate-300 dark:border-slate-600 text-slate-500 rounded-lg"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>
        )

        const maxVisiblePages = 5
        let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2))
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1)
        }

        if (startPage > 1) {
            buttons.push(
                <Button
                    key={1}
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg"
                    onClick={() => setPage(1)}
                >
                    1
                </Button>
            )
            if (startPage > 2) {
                buttons.push(<span key="dots1" className="px-1 text-slate-400">...</span>)
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            buttons.push(
                <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className={`h-9 w-9 p-0 rounded-lg ${i === page
                        ? 'border-primary bg-primary/10 dark:bg-primary/40 text-primary dark:text-blue-200 font-bold'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                        }`}
                    onClick={() => setPage(i)}
                >
                    {i}
                </Button>
            )
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                buttons.push(<span key="dots2" className="px-1 text-slate-400">...</span>)
            }
            buttons.push(
                <Button
                    key={totalPages}
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg"
                    onClick={() => setPage(totalPages)}
                >
                    {totalPages}
                </Button>
            )
        }

        buttons.push(
            <Button
                key="next"
                variant="outline"
                size="icon"
                className="w-9 h-9 border-slate-300 dark:border-slate-600 text-slate-500 rounded-lg"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        )

        return buttons
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in">
            {/* Main Container */}
            <div className="flex flex-col flex-1 overflow-y-auto p-6 max-w-[1600px] mx-auto w-full">
                {/* Card Container Layout */}
                <div className="bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1">
                    {/* Header Section */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                <Wrench className="h-6 w-6 text-primary dark:text-blue-200" />
                                {t('tools.title')}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                {t('tools.subtitle')}
                            </p>
                        </div>


                        {/* Add Alat Dialog */}
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 dark:shadow-none transition-all rounded-md cursor-pointer">
                                    <Plus className="mr-2 h-5 w-5" />
                                    {t('tools.addTool')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-6">
                                <DialogHeader>
                                    <DialogTitle>{t('tools.addTitle')}</DialogTitle>
                                    <DialogDescription>
                                        {t('tools.addDesc')}
                                    </DialogDescription>

                                </DialogHeader>
                                <div className="grid gap-4 py-4 overflow-y-auto px-1">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="add-nama">{t('tools.name')}</Label>
                                            <Input
                                                id="add-nama"
                                                placeholder={t('tools.name')}
                                                className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                                value={addForm.nama}
                                                onChange={(e) => setAddForm(prev => ({ ...prev, nama: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="add-kode">{t('tools.code')}</Label>
                                            <Input
                                                id="add-kode"
                                                placeholder="Contoh: ELK-001"
                                                className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                                value={addForm.kode}
                                                onChange={(e) => setAddForm(prev => ({ ...prev, kode: e.target.value }))}
                                            />
                                        </div>

                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="add-kategori">{t('tools.category')}</Label>
                                            <Select
                                                value={addForm.kategoriId?.toString() || ''}
                                                onValueChange={(value) => setAddForm(prev => ({ ...prev, kategoriId: value ? parseInt(value) : undefined }))}
                                            >
                                                <SelectTrigger id="add-kategori" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                                    <SelectValue placeholder={t('tools.selectCategory')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {kategoriList.map(kat => (
                                                        <SelectItem key={kat.id} value={kat.id.toString()}>{kat.nama}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="add-kondisi">{t('tools.condition')}</Label>
                                            <Select
                                                value={addForm.kondisi}
                                                onValueChange={(value) => setAddForm(prev => ({ ...prev, kondisi: value }))}
                                            >
                                                <SelectTrigger id="add-kondisi" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                                    <SelectValue placeholder={t('tools.condition')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Baik">{t('tools.condition.good')}</SelectItem>
                                                    <SelectItem value="Rusak">{t('tools.condition.damaged')}</SelectItem>
                                                    <SelectItem value="Hilang">{t('tools.condition.lost')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>


                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="add-stok">{t('tools.initialStock')}</Label>
                                            <Input
                                                id="add-stok"
                                                type="number"
                                                placeholder="1"
                                                min="1"
                                                className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                                value={addForm.stokTotal}
                                                onChange={(e) => setAddForm(prev => ({ ...prev, stokTotal: parseInt(e.target.value) || 1 }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="add-status">{t('common.status')}</Label>
                                            <Select
                                                value={addForm.status}
                                                onValueChange={(value) => setAddForm(prev => ({ ...prev, status: value as 'tersedia' | 'habis' | 'maintenance' }))}
                                            >
                                                <SelectTrigger id="add-status" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                                    <SelectValue placeholder={t('tools.selectStatus')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="tersedia">{t('tools.status.available')}</SelectItem>
                                                    <SelectItem value="habis">{t('tools.status.outOfStock')}</SelectItem>
                                                    <SelectItem value="maintenance">{t('tools.status.maintenance')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>


                                    <div className="space-y-2">
                                        <Label htmlFor="add-deskripsi">{t('categories.description')}</Label>
                                        <Input
                                            id="add-deskripsi"
                                            placeholder={t('tools.descPlaceholder')}
                                            className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                            value={addForm.deskripsi}
                                            onChange={(e) => setAddForm(prev => ({ ...prev, deskripsi: e.target.value }))}
                                        />
                                    </div>


                                    <div className="space-y-2">
                                        <Label>{t('tools.photo')}</Label>
                                        <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative overflow-hidden">
                                            {addPhotoPreview ? (
                                                <div className="relative w-full h-32">
                                                    <img src={addPhotoPreview} alt="Preview" className="w-full h-full object-contain" />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            setAddPhotoFile(null)
                                                            setAddPhotoPreview('')
                                                        }}
                                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 z-10 shadow-sm transition-transform hover:scale-110"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <UploadCloud className="h-8 w-8 mb-2" />
                                                    <span className="text-sm">{t('tools.uploadPhoto')}</span>
                                                    <span className="text-xs text-slate-400">{t('tools.photoFormat')}</span>
                                                </>
                                            )}

                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,image/gif"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={handleAddPhotoChange}
                                            />
                                        </label>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline" className='cursor-pointer'>{t('common.cancel')}</Button>
                                    </DialogClose>
                                    <Button
                                        type="submit"
                                        className="bg-primary hover:bg-primary/90 dark:text-white cursor-pointer"
                                        onClick={handleAddAlat}
                                        disabled={creating || uploading || !addForm.kode || !addForm.nama}
                                    >
                                        {(creating || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {uploading ? t('tools.uploading') : t('tools.save')}
                                    </Button>
                                </DialogFooter>

                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Filter Toolbar */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center">
                        {/* Search */}
                        <div className="relative w-full md:flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <Input
                                className="pl-10 bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600 focus-visible:ring-primary"
                                placeholder={t('tools.searchPlaceholder')}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </div>

                        {/* Filters */}
                        <div className="md:w-48 lg:w-56">
                            <Select
                                value={kategoriFilter?.toString() || undefined}
                                onValueChange={(value) => setKategoriFilter(value === "all" ? "" : value)}
                            >
                                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                    <SelectValue placeholder={t('catalog.allCategories')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {/* We use specific logic for 'all' in onValueChange if needed, but setKategoriFilter likely accepts string.
                                            Actually, setKategoriFilter usually takes string or number. If we want to clear it, we might need a specific value logic.
                                            Let's check usage. The original was empty string. SelectItem value cannot be empty string in some versions,
                                            but let's try strict value control.
                                            Better approach:
                                            Current hook likely treats empty string as "no filter".
                                            Let's use a specific clear value handling.
                                        */}
                                        {t('catalog.allCategories')}
                                    </SelectItem>
                                    {kategoriList.map(kat => (
                                        <SelectItem key={kat.id} value={kat.id.toString()}>{kat.nama}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:w-48 lg:w-56">
                            <Select
                                value={kondisiFilter || undefined}
                                onValueChange={(value) => setKondisiFilter(value === "all" ? "" : value)}
                            >
                                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                    <SelectValue placeholder={t('common.allStatus')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('common.allStatus')}</SelectItem>
                                    <SelectItem value="tersedia">{t('tools.status.available')}</SelectItem>
                                    <SelectItem value="habis">{t('tools.status.outOfStock')}</SelectItem>
                                    <SelectItem value="maintenance">{t('tools.status.maintenance')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex justify-end gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 cursor-pointer">
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)} className='cursor-pointer'>
                                        <Upload className="mr-2 h-4 w-4" />
                                        <span>Import</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsExportDialogOpen(true)} className='cursor-pointer'>
                                        <Download className="mr-2 h-4 w-4" />
                                        <span>Export</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* Table Container */}
                <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 relative min-h-[460px]">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : alat.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500">
                            <p className="text-lg font-medium">{t('tools.noData')}</p>
                            <p className="text-sm">{t('tools.noDataDesc')}</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20 first:border-l last:border-r border-slate-200 dark:border-slate-700">{t('tools.image')}</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider first:border-l last:border-r border-slate-200 dark:border-slate-700">{t('tools.name')}</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider first:border-l last:border-r border-slate-200 dark:border-slate-700">{t('tools.category')}</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider first:border-l last:border-r border-slate-200 dark:border-slate-700">{t('common.status')}</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center first:border-l last:border-r border-slate-200 dark:border-slate-700">{t('tools.totalStock')}</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center first:border-l last:border-r border-slate-200 dark:border-slate-700">{t('tools.action')}</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {alat.map((item, index) => (
                                    <tr
                                        key={item.id}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${index % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''}`}
                                    >
                                        <td className="px-6 py-4 first:border-l last:border-r border-slate-200 dark:border-slate-700">
                                            <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center overflow-hidden">
                                                {item.gambar ? (
                                                    <img src={item.gambar} alt={item.nama} className="h-full w-full object-cover" />
                                                ) : (
                                                    <Wrench className="h-6 w-6 text-slate-400" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap first:border-l last:border-r border-slate-200 dark:border-slate-700">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">{item.nama}</div>
                                                <div className="text-xs text-slate-500 font-mono mt-0.5">{item.kode}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap first:border-l last:border-r border-slate-200 dark:border-slate-700">
                                            <span className="text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600">
                                                {item.kategori?.nama || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap first:border-l last:border-r border-slate-200 dark:border-slate-700">
                                            {getStatusBadge(item.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center first:border-l last:border-r border-slate-200 dark:border-slate-700">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-sm font-bold ${item.stokTersedia === 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {item.stokTersedia}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {t('tools.ofUnits', { total: item.stokTotal })}
                                                </span>
                                                {(item.stokPerbaikan ?? 0) > 0 && (
                                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                                        {item.stokPerbaikan} {t('tools.status.maintenance')}
                                                    </span>
                                                )}
                                            </div>

                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium first:border-l last:border-r border-slate-200 dark:border-slate-700">
                                            <div className="flex justify-center gap-1">
                                                {/* Edit Button */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50"
                                                    onClick={() => handleEditClick(item)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>

                                                {/* Delete Button */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50"
                                                    onClick={() => setDeletingAlat(item)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between rounded-b-lg">
                    <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                        {t('common.showing')} <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {alat.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0}-{Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span> {t('common.of')} <span className="font-semibold text-slate-700 dark:text-slate-200">{pagination.total}</span> {t('common.data')}
                    </div>
                    <div className="flex items-center space-x-2">

                        {renderPaginationButtons()}
                    </div>
                </div>
            </div>
            {/* Edit Alat Dialog */}
            <Dialog open={!!editingAlat} onOpenChange={(open) => !open && setEditingAlat(null)}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle>{t('tools.editTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('tools.editDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 text-left overflow-y-auto px-1">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-nama">{t('tools.name')}</Label>
                                <Input
                                    id="edit-nama"
                                    className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                    value={editForm.nama || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, nama: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-kode">{t('tools.code')}</Label>
                                <Input
                                    id="edit-kode"
                                    className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                    value={editForm.kode || ''}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, kode: e.target.value }))}
                                />
                            </div>
                        </div>


                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-kategori">{t('tools.category')}</Label>
                                <Select
                                    value={editForm.kategoriId?.toString() || ''}
                                    onValueChange={(value) => setEditForm(prev => ({ ...prev, kategoriId: value ? parseInt(value) : undefined }))}
                                >
                                    <SelectTrigger id="edit-kategori" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                        <SelectValue placeholder={t('tools.selectCategory')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {kategoriList.map(kat => (
                                            <SelectItem key={kat.id} value={kat.id.toString()}>{kat.nama}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-kondisi">{t('tools.condition')}</Label>
                                <Select
                                    value={editForm.kondisi || ''}
                                    onValueChange={(value) => setEditForm(prev => ({ ...prev, kondisi: value }))}
                                >
                                    <SelectTrigger id="edit-kondisi" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                        <SelectValue placeholder={t('tools.condition')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Baik">{t('tools.condition.good')}</SelectItem>
                                        <SelectItem value="Rusak">{t('tools.condition.damaged')}</SelectItem>
                                        <SelectItem value="Hilang">{t('tools.condition.lost')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>


                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-stok-total">{t('tools.totalStock')}</Label>
                                <Input
                                    id="edit-stok-total"
                                    type="number"
                                    min="1"
                                    className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                    value={editForm.stokTotal || 0}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, stokTotal: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-stok-tersedia">{t('tools.availableStock')}</Label>
                                <Input
                                    id="edit-stok-tersedia"
                                    type="number"
                                    min="0"
                                    className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                    value={editForm.stokTersedia || 0}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, stokTersedia: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-stok-perbaikan" className="text-amber-600 dark:text-amber-400">Dalam Perbaikan</Label>
                                <Input
                                    id="edit-stok-perbaikan"
                                    type="number"
                                    min="0"
                                    className="bg-white dark:bg-slate-900 dark:text-white border-amber-200 dark:border-amber-800 focus:ring-amber-500"
                                    value={editForm.stokPerbaikan || 0}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, stokPerbaikan: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                        </div>

                        {/* Status dropdown - allows changing from Perbaikan to Tersedia */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-status">{t('common.status')}</Label>
                            <Select
                                value={editForm.status || 'tersedia'}
                                onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value as 'tersedia' | 'habis' | 'maintenance' }))}
                            >
                                <SelectTrigger id="edit-status" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                    <SelectValue placeholder={t('tools.selectStatus')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tersedia">{t('tools.status.available')}</SelectItem>
                                    <SelectItem value="habis">{t('tools.status.outOfStock')}</SelectItem>
                                    <SelectItem value="maintenance">{t('tools.status.maintenance')}</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300 mt-2">
                                <span className="font-bold">Info:</span> {language === 'id' ? 'Jika alat selesai diperbaiki, kurangi "Dalam Perbaikan" dan tambah "Stok Tersedia" secara manual.' : 'If repaired, reduce "In Repair" and increase "Available Stock" manually.'}
                            </div>

                            {editForm.status === 'maintenance' && (
                                <p className="text-xs text-orange-600 dark:text-orange-400">
                                    {language === 'id' ? 'Alat sedang dalam perbaikan. Ubah ke "Tersedia" jika sudah selesai diperbaiki.' : 'Tool is under maintenance. Change to "Available" when repair is complete.'}
                                </p>
                            )}
                        </div>


                        <div className="space-y-2">
                            <Label htmlFor="edit-deskripsi">{t('categories.description')}</Label>
                            <Input
                                id="edit-deskripsi"
                                className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                value={editForm.deskripsi || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, deskripsi: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t('tools.photo')}</Label>
                            <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative overflow-hidden">
                                {editPhotoPreview ? (
                                    <div className="relative w-full h-32">
                                        <img src={editPhotoPreview} alt="Preview" className="w-full h-full object-contain" />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                setEditPhotoFile(null)
                                                setEditPhotoPreview('')
                                                setEditForm(prev => ({ ...prev, gambar: '' }))
                                            }}
                                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 z-10 shadow-sm transition-transform hover:scale-110"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <UploadCloud className="h-8 w-8 mb-2" />
                                        <span className="text-sm">{t('tools.uploadPhoto')}</span>
                                        <span className="text-xs text-slate-400">{t('tools.photoFormat')}</span>
                                    </>
                                )}

                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleEditPhotoChange}
                                />
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingAlat(null)} className='cursor-pointer'>{t('common.cancel')}</Button>
                        <Button
                            type="submit"
                            className="bg-primary hover:bg-primary/90 dark:text-white cursor-pointer"
                            onClick={handleUpdateAlat}
                            disabled={updating || uploading}
                        >
                            {(updating || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {uploading ? t('tools.uploading') : t('tools.saveChanges')}
                        </Button>
                    </DialogFooter>

                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingAlat} onOpenChange={(open) => !open && setDeletingAlat(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            {t('tools.deleteTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('tools.deleteConfirm', { name: deletingAlat?.nama || '' })}
                            {t('tools.deleteWarning')}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingAlat(null)} className='cursor-pointer'>{t('common.cancel')}</Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                            onClick={handleDeleteAlat}
                            disabled={deleting}
                        >
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('returns.yesDelete')}
                        </Button>
                    </DialogFooter>

                </DialogContent>
            </Dialog>

            {/* Export Dialog */}
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogContent className="sm:max-w-[500px] dark:bg-slate-950 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5 text-primary dark:text-slate-100" />
                            <span className="dark:text-slate-100">Export Data Alat</span>
                        </DialogTitle>
                        <DialogDescription className="dark:text-slate-400">
                            Pilih kolom yang ingin diexport lalu pilih format file
                        </DialogDescription>
                    </DialogHeader>

                    {/* Column Selection */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Pilih Kolom</span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={selectAllColumns}
                                    className="text-xs text-primary hover:text-primary/80 dark:text-slate-300 dark:hover:text-slate-100 font-medium transition-colors"
                                >
                                    Pilih Semua
                                </button>
                                <span className="text-slate-300 dark:text-slate-600">|</span>
                                <button
                                    type="button"
                                    onClick={deselectAllColumns}
                                    className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium transition-colors"
                                >
                                    Hapus Semua
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {exportColumns.map((col) => (
                                <label
                                    key={col.key}
                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedColumns.includes(col.key)
                                        ? 'border-primary bg-primary/5 dark:border-primary/50 dark:bg-primary/10'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
                                        }`}
                                >
                                    <div className={`flex items-center justify-center w-5 h-5 rounded border ${selectedColumns.includes(col.key)
                                        ? 'bg-primary border-primary text-white'
                                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950'
                                        }`}>
                                        {selectedColumns.includes(col.key) && <CheckCircle className="w-3.5 h-3.5" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={selectedColumns.includes(col.key)}
                                        onChange={() => toggleColumn(col.key)}
                                        className="hidden"
                                    />
                                    <span className={`text-sm font-medium ${selectedColumns.includes(col.key)
                                        ? 'text-primary dark:text-slate-100'
                                        : 'text-slate-700 dark:text-slate-300'
                                        }`}>
                                        {col.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                            {selectedColumns.length} dari {exportColumns.length} kolom dipilih
                        </p>
                    </div>

                    {/* Export Format Buttons */}
                    <div className="grid grid-cols-2 gap-4 pt-4">
                        <button
                            onClick={handleExportCSV}
                            disabled={selectedColumns.length === 0}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group cursor-pointer ${selectedColumns.length === 0
                                ? 'border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900'
                                : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 bg-white dark:bg-slate-900'
                                }`}
                        >
                            <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-500/10 mb-2 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/20 transition-colors">
                                <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Export CSV</span>
                            <span className="text-xs text-slate-500 dark:text-slate-500">.csv format</span>
                        </button>
                        <button
                            onClick={handleExportExcel}
                            disabled={selectedColumns.length === 0}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all group cursor-pointer ${selectedColumns.length === 0
                                ? 'border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900'
                                : 'border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 bg-white dark:bg-slate-900'
                                }`}
                        >
                            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-500/10 mb-2 group-hover:bg-blue-200 dark:group-hover:bg-blue-500/20 transition-colors">
                                <FileSpreadsheet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Export Excel</span>
                            <span className="text-xs text-slate-500">.xlsx format</span>
                        </button>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} className="w-full dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer">
                            {t('common.cancel')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Dialog */}
            <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
                setIsImportDialogOpen(open)
                if (!open) resetImport()
            }}>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto dark:bg-slate-950 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileUp className="h-5 w-5 text-primary dark:text-slate-100" />
                            <span className="dark:text-slate-100">Import Data Alat</span>
                        </DialogTitle>
                        <DialogDescription className="dark:text-slate-400">
                            {importStep === 'upload' && 'Upload file CSV atau Excel untuk import data alat.'}
                            {importStep === 'mapping' && 'Cocokkan kolom file dengan field yang diperlukan.'}
                            {importStep === 'preview' && 'Preview data sebelum import.'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Step Indicator */}
                    <div className="flex items-center justify-center gap-2 py-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${importStep === 'upload' ? 'bg-primary text-white dark:bg-white/10' : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'}`}>
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">1</span>
                            Upload
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${importStep === 'mapping' ? 'bg-primary text-white dark:bg-white/10' : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'}`}>
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">2</span>
                            Mapping
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${importStep === 'preview' ? 'bg-primary text-white dark:bg-white/10' : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'}`}>
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">3</span>
                            Preview
                        </div>
                    </div>

                    {/* Step Content */}
                    {importStep === 'upload' && (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center hover:border-primary dark:hover:border-slate-600 transition-colors bg-white dark:bg-slate-900/50">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="import-file-upload-alat"
                                />
                                <label htmlFor="import-file-upload-alat" className="cursor-pointer">
                                    <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-900 w-16 h-16 mx-auto mb-4 flex items-center justify-center transition-colors group-hover:bg-slate-200 dark:group-hover:bg-slate-800">
                                        <FileUp className="h-8 w-8 text-slate-400 dark:text-slate-400" />
                                    </div>
                                    <p className="text-slate-700 dark:text-slate-200 font-medium mb-1">Klik untuk upload file</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">atau drag & drop file ke sini</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Format: CSV, Excel (.xlsx, .xls)</p>
                                </label>
                            </div>
                            {importFile && (
                                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-200 dark:border-green-900/50">
                                    <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-green-700 dark:text-green-300">{importFile.name}</p>
                                        <p className="text-xs text-green-600 dark:text-green-400">{importFileData.length} baris data ditemukan</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={resetImport} className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/30">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {importStep === 'mapping' && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                    Cocokkan kolom dari file dengan field yang diperlukan:
                                </p>
                                <div className="space-y-3">
                                    {/* Nama Alat Mapping - Required */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium text-sm">
                                            Nama Alat <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="flex-1">
                                            <Select value={columnMapping.nama || undefined} onValueChange={(value) => setColumnMapping(prev => ({ ...prev, nama: value }))}>
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700 focus:ring-primary dark:focus:ring-slate-500">
                                                    <SelectValue placeholder="-- Pilih kolom --" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {importFileHeaders.map(header => (
                                                        <SelectItem key={header} value={header}>{header}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Kode Mapping - Optional */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium text-sm">Kode</Label>
                                        <div className="flex-1">
                                            <Select value={columnMapping.kode || "skip_column_option"} onValueChange={(value) => setColumnMapping(prev => ({ ...prev, kode: value === 'skip_column_option' ? '' : value }))}>
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700">
                                                    <SelectValue placeholder="-- Auto generate --" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="skip_column_option">-- Auto generate --</SelectItem>
                                                    {importFileHeaders.map(header => (
                                                        <SelectItem key={header} value={header}>{header}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Kategori Mapping - Optional */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium text-sm">Kategori</Label>
                                        <div className="flex-1">
                                            <Select value={columnMapping.kategori || "skip_column_option"} onValueChange={(value) => setColumnMapping(prev => ({ ...prev, kategori: value === 'skip_column_option' ? '' : value }))}>
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700">
                                                    <SelectValue placeholder="-- Pilih kolom (opsional) --" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="skip_column_option">-- Pilih kolom (opsional) --</SelectItem>
                                                    {importFileHeaders.map(header => (
                                                        <SelectItem key={header} value={header}>{header}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Stok Mapping - Optional */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium text-sm">Stok</Label>
                                        <div className="flex-1">
                                            <Select value={columnMapping.stokTotal || "skip_column_option"} onValueChange={(value) => setColumnMapping(prev => ({ ...prev, stokTotal: value === 'skip_column_option' ? '' : value }))}>
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700">
                                                    <SelectValue placeholder="-- Default: 1 --" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="skip_column_option">-- Default: 1 --</SelectItem>
                                                    {importFileHeaders.map(header => (
                                                        <SelectItem key={header} value={header}>{header}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Kondisi Mapping - Optional */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium text-sm">Kondisi</Label>
                                        <div className="flex-1">
                                            <Select value={columnMapping.kondisi || "skip_column_option"} onValueChange={(value) => setColumnMapping(prev => ({ ...prev, kondisi: value === 'skip_column_option' ? '' : value }))}>
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700">
                                                    <SelectValue placeholder="-- Default: Baik --" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="skip_column_option">-- Default: Baik --</SelectItem>
                                                    {importFileHeaders.map(header => (
                                                        <SelectItem key={header} value={header}>{header}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Status Mapping - Optional */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium text-sm">Status</Label>
                                        <div className="flex-1">
                                            <Select value={columnMapping.status || "skip_column_option"} onValueChange={(value) => setColumnMapping(prev => ({ ...prev, status: value === 'skip_column_option' ? '' : value }))}>
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700">
                                                    <SelectValue placeholder="-- Default: Tersedia --" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="skip_column_option">-- Default: Tersedia --</SelectItem>
                                                    {importFileHeaders.map(header => (
                                                        <SelectItem key={header} value={header}>{header}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Deskripsi Mapping - Optional */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium text-sm">Deskripsi</Label>
                                        <div className="flex-1">
                                            <Select value={columnMapping.deskripsi || "skip_column_option"} onValueChange={(value) => setColumnMapping(prev => ({ ...prev, deskripsi: value === 'skip_column_option' ? '' : value }))}>
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700">
                                                    <SelectValue placeholder="-- Pilih kolom (opsional) --" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="skip_column_option">-- Pilih kolom (opsional) --</SelectItem>
                                                    {importFileHeaders.map(header => (
                                                        <SelectItem key={header} value={header}>{header}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {!columnMapping.nama && (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/50">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                                    <p className="text-sm text-amber-700 dark:text-amber-400">Kolom Nama Alat wajib dipilih</p>
                                </div>
                            )}
                        </div>
                    )}

                    {importStep === 'preview' && (
                        <div className="space-y-4">
                            {/* Duplicate Warning */}
                            {duplicateRows.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 border border-red-200 dark:border-red-900/50">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                                Import gagal! {duplicateRows.length} data tidak dapat diimport karena sudah ada di database:
                                            </p>
                                            <div className="mt-2 text-xs text-red-600 dark:text-red-400 space-y-1 max-h-20 overflow-y-auto">
                                                {duplicateRows.slice(0, 5).map((dup, idx) => (
                                                    <p key={idx}>Baris {dup.row}: "{dup.nama}"</p>
                                                ))}
                                                {duplicateRows.length > 5 && (
                                                    <p>...dan {duplicateRows.length - 5} lainnya</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                    Preview data yang akan diimport ({importFileData.length} baris):
                                </p>
                                <div className="max-h-[300px] overflow-auto border border-slate-200 dark:border-slate-700 rounded-md">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">#</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Nama</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Kategori</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Stok</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                            {importFileData.slice(0, 10).map((row, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                    <td className="px-3 py-2 text-slate-500 dark:text-slate-500">{idx + 1}</td>
                                                    <td className="px-3 py-2 text-slate-900 dark:text-white font-medium">
                                                        {columnMapping.nama ? row[columnMapping.nama] : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                                        {columnMapping.kategori ? row[columnMapping.kategori] : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                                        {columnMapping.stokTotal ? row[columnMapping.stokTotal] : '1'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {importFileData.length > 10 && (
                                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 text-center">
                                        ... dan {importFileData.length - 10} baris lainnya
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2 pt-4">
                        {importStep === 'upload' && (
                            <>
                                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} className="flex-1 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer">
                                    Batal
                                </Button>
                                <Button
                                    onClick={() => setImportStep('mapping')}
                                    disabled={!importFile || importFileData.length === 0}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white cursor-pointer"
                                >
                                    Lanjut
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </>
                        )}
                        {importStep === 'mapping' && (
                            <>
                                <Button variant="outline" onClick={() => setImportStep('upload')} className="flex-1 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer">
                                    <ChevronLeft className="mr-1 h-4 w-4" />
                                    Kembali
                                </Button>
                                <Button
                                    onClick={() => { setDuplicateRows([]); setImportStep('preview'); }}
                                    disabled={!columnMapping.nama}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-white cursor-pointer"
                                >
                                    Lanjut
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                </Button>
                            </>
                        )}
                        {importStep === 'preview' && (
                            <>
                                <Button variant="outline" onClick={() => setImportStep('mapping')} className="flex-1 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 cursor-pointer">
                                    <ChevronLeft className="mr-1 h-4 w-4" />
                                    Kembali
                                </Button>
                                <Button
                                    onClick={handleImportSubmit}
                                    disabled={importing}
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                                >
                                    {importing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Import Data
                                        </>
                                    )}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
