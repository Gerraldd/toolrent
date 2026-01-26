'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
    Plus,
    Search,
    ChevronLeft,
    ChevronRight,
    Folder,
    Edit,
    Trash2,
    Package,
    ArrowRight,
    Loader2,
    Tags,
    Download,
    Upload,
    Settings,
    FileSpreadsheet,
    FileText,
    AlertTriangle,
    CheckCircle,
    X,
    FileUp
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
import { useKategori, useCreateKategori, useUpdateKategori, useDeleteKategori } from '@/hooks/use-kategori'
import { Kategori, CreateKategoriInput, UpdateKategoriInput } from '@/lib/api-client'
import { useLanguage } from '@/contexts/language-context'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'


// Color palette for category cards
const colorPalette = [
    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
]

export default function KategoriPage() {
    const { t } = useLanguage()
    // State for search

    const [searchValue, setSearchValue] = useState('')

    // Dialog states
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
    const [editingKategori, setEditingKategori] = useState<Kategori | null>(null)
    const [deletingKategori, setDeletingKategori] = useState<Kategori | null>(null)

    // Import states
    const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importFileHeaders, setImportFileHeaders] = useState<string[]>([])
    const [importFileData, setImportFileData] = useState<Record<string, string>[]>([])
    const [columnMapping, setColumnMapping] = useState<{ nama: string; deskripsi: string }>({ nama: '', deskripsi: '' })
    const [importing, setImporting] = useState(false)
    const [duplicateRows, setDuplicateRows] = useState<{ row: number; nama: string }[]>([])
    const [checkingDuplicates, setCheckingDuplicates] = useState(false)

    // Form states for Add Kategori
    const [addForm, setAddForm] = useState<CreateKategoriInput>({
        nama: '',
        deskripsi: ''
    })

    // Form states for Edit Kategori
    const [editForm, setEditForm] = useState<UpdateKategoriInput>({})

    // Pagination State
    const [page, setPage] = useState(1)
    const [limit] = useState(8) // 8 items per page (2 rows x 4 cols)

    // Use hooks
    const { kategori, loading, refetch, setSearch } = useKategori()

    const { createKategori, loading: creating } = useCreateKategori(() => {
        setIsAddDialogOpen(false)
        resetAddForm()
        refetch()
    })

    const { updateKategori, loading: updating } = useUpdateKategori(() => {
        setEditingKategori(null)
        refetch()
    })

    const { deleteKategori, loading: deleting } = useDeleteKategori(() => {
        setDeletingKategori(null)
        refetch()
    })

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchValue)
        }, 300)
    }, [searchValue, setSearch])

    // Reset page on search
    useEffect(() => {
        setPage(1)
    }, [searchValue])

    // Available export columns
    const exportColumns = [
        { key: 'no', label: 'No' },
        { key: 'nama', label: 'Nama Kategori' },
        { key: 'deskripsi', label: 'Deskripsi' },
        { key: 'jumlahAlat', label: 'Jumlah Alat' }
    ]

    // State for selected export columns
    const [selectedColumns, setSelectedColumns] = useState<string[]>(['no', 'nama', 'deskripsi', 'jumlahAlat'])

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

        const rows = kategori.map((item, index) => {
            const row: (string | number)[] = []
            if (selectedColumns.includes('no')) row.push(index + 1)
            if (selectedColumns.includes('nama')) row.push(item.nama)
            if (selectedColumns.includes('deskripsi')) row.push(item.deskripsi || '-')
            if (selectedColumns.includes('jumlahAlat')) row.push(item._count?.alat || 0)
            return row
        })

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `Data_Kategori_${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        setIsExportDialogOpen(false)
    }

    const handleExportExcel = () => {
        if (selectedColumns.length === 0) return

        const data = kategori.map((item, index) => {
            const row: Record<string, string | number> = {}
            if (selectedColumns.includes('no')) row['No'] = index + 1
            if (selectedColumns.includes('nama')) row['Nama Kategori'] = item.nama
            if (selectedColumns.includes('deskripsi')) row['Deskripsi'] = item.deskripsi || '-'
            if (selectedColumns.includes('jumlahAlat')) row['Jumlah Alat'] = item._count?.alat || 0
            return row
        })

        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Kategori')
        XLSX.writeFile(workbook, `Data_Kategori_${new Date().toISOString().split('T')[0]}.xlsx`)
        setIsExportDialogOpen(false)
    }

    // Import handlers
    const resetImport = () => {
        setImportStep('upload')
        setImportFile(null)
        setImportFileHeaders([])
        setImportFileData([])
        setColumnMapping({ nama: '', deskripsi: '' })
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
                    h.toLowerCase().includes('name') ||
                    h.toLowerCase().includes('kategori')
                )
                const deskripsiMatch = headers.find(h =>
                    h.toLowerCase().includes('deskripsi') ||
                    h.toLowerCase().includes('description') ||
                    h.toLowerCase().includes('keterangan')
                )

                setColumnMapping({
                    nama: namaMatch || '',
                    deskripsi: deskripsiMatch || ''
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
            const existingNames = new Set(kategori.map(k => k.nama.toLowerCase()))
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
                deskripsi: row[columnMapping.deskripsi] || ''
            })).filter(item => item.nama.trim() !== '')

            if (importData.length === 0) {
                setImporting(false)
                return
            }

            const res = await fetch('/api/kategori/import', {
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

    // Pagination Calculations
    const totalItems = kategori.length
    const totalPages = Math.ceil(totalItems / limit)
    const paginatedKategori = kategori.slice((page - 1) * limit, page * limit)

    // Generate pagination buttons
    const renderPaginationButtons = () => {
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

    // Reset add form
    const resetAddForm = () => {
        setAddForm({
            nama: '',
            deskripsi: ''
        })
    }

    // Handle add kategori submit
    const handleAddKategori = async () => {
        if (!addForm.nama) {
            return
        }
        await createKategori(addForm)
    }

    // Handle edit kategori
    const handleEditClick = (item: Kategori) => {
        setEditingKategori(item)
        setEditForm({
            nama: item.nama,
            deskripsi: item.deskripsi || ''
        })
    }

    // Handle update kategori submit
    const handleUpdateKategori = async () => {
        if (!editingKategori) return
        await updateKategori(editingKategori.id, editForm)
    }

    // Handle delete kategori
    const handleDeleteKategori = async () => {
        if (!deletingKategori) return
        await deleteKategori(deletingKategori.id)
    }

    // Get color for category card
    const getColor = (index: number) => {
        return colorPalette[index % colorPalette.length]
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50/50 dark:bg-slate-900/50 animate-fade-in">
            {/* Main Container */}
            <div className="flex flex-col flex-1 overflow-hidden p-6 max-w-[1600px] mx-auto w-full">
                {/* Card Container Layout */}
                <div className="bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 overflow-hidden">
                    {/* Header Section */}
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                <Tags className="h-6 w-6 text-primary dark:text-blue-200" />
                                {t('categories.title')}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                {t('categories.subtitle')}
                            </p>
                        </div>


                        {/* Add Kategori Dialog */}
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 dark:shadow-none transition-all rounded-md cursor-pointer">
                                    <Plus className="mr-2 h-5 w-5" />
                                    {t('categories.addCategory')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>{t('categories.addTitle')}</DialogTitle>
                                    <DialogDescription>
                                        {t('categories.addDesc')}
                                    </DialogDescription>

                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="add-nama-kategori">{t('categories.name')}</Label>
                                        <Input
                                            id="add-nama-kategori"
                                            className="col-span-3 bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                            value={addForm.nama}
                                            onChange={(e) => setAddForm(prev => ({ ...prev, nama: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-deskripsi-kategori">{t('categories.description')}</Label>
                                        <Input
                                            id="add-deskripsi-kategori"
                                            className="col-span-3 bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                            value={addForm.deskripsi}
                                            onChange={(e) => setAddForm(prev => ({ ...prev, deskripsi: e.target.value }))}
                                        />
                                    </div>

                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline" className='cursor-pointer'>{t('common.cancel')}</Button>
                                    </DialogClose>
                                    <Button
                                        type="submit"
                                        className="bg-primary hover:bg-primary/90 dark:text-white cursor-pointer"
                                        onClick={handleAddKategori}
                                        disabled={creating || !addForm.nama}
                                    >
                                        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t('categories.save')}
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
                                placeholder={t('categories.searchPlaceholder')}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />

                        </div>

                        <div className="flex justify-end gap-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 cursor-pointer">
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="dark:bg-slate-800 dark:border-slate-700">
                                    <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)} className="dark:text-slate-100 dark:focus:bg-slate-700 cursor-pointer">
                                        <Upload className="mr-2 h-4 w-4" />
                                        <span>Import</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsExportDialogOpen(true)} className="dark:text-slate-100 dark:focus:bg-slate-700 cursor-pointer">
                                        <Download className="mr-2 h-4 w-4" />
                                        <span>Export</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>


                    </div>

                    {/* Grid Content Container */}
                    <div className="flex-1 overflow-auto p-6 bg-slate-50/50 dark:bg-slate-800/50">
                        {loading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : kategori.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <Folder className="h-12 w-12 mb-4 text-slate-400" />
                                <p className="text-lg font-medium">{t('categories.noData')}</p>
                                <p className="text-sm">{t('categories.noDataDesc')}</p>
                            </div>

                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {paginatedKategori.map((item, index) => (
                                    <Card key={item.id} className="group hover:shadow-md transition-all duration-200 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md overflow-hidden flex flex-col h-full hover:border-primary/50">
                                        <CardContent className="p-5 flex flex-col h-full">
                                            {/* Header Card */}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`p-3 rounded-lg ${getColor(index)} bg-opacity-20`}>
                                                    <Folder className="h-6 w-6" />
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {/* Edit Button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-500 hover:text-blue-400 hover:bg-blue-50"
                                                        onClick={() => handleEditClick(item)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>

                                                    {/* Delete Button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-50"
                                                        onClick={() => setDeletingKategori(item)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Content Card */}
                                            <div className="flex-1 mb-4">
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                                                    {item.nama}
                                                </h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                                    {item.deskripsi || t('activityLog.detail.noDescription')}
                                                </p>

                                            </div>

                                            {/* Footer Card */}
                                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-sm">
                                                <div className="flex items-center text-slate-500 font-medium">
                                                    <Package className="h-4 w-4 mr-2" />
                                                    {item._count?.alat || 0} {t('categories.items')}
                                                </div>
                                                <Link href={`/admin/alat?kategoriId=${item.id}`} className="text-primary dark:text-blue-200 dark:hover:text-white hover:text-primary/80 font-medium flex items-center text-xs transition-colors">
                                                    {t('categories.viewTools')} <ArrowRight className="ml-1 h-3 w-3" />
                                                </Link>

                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {/* Add New Card */}
                                <div
                                    className="group border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-md p-5 flex flex-col items-center justify-center text-slate-400 hover:text-primary dark:hover:text-blue-200 hover:border-primary dark:hover:border-slate-600 hover:bg-primary/5 dark:hover:bg-slate-950 transition-all cursor-pointer h-full min-h-[220px]"
                                    onClick={() => setIsAddDialogOpen(true)}
                                >
                                    <div className="p-4 rounded-full bg-slate-50 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900 mb-3 transition-colors shadow-sm">
                                        <Plus className="h-8 w-8 text-slate-400 group-hover:text-primary dark:group-hover:text-blue-200" />
                                    </div>
                                    <span className="font-medium group-hover:text-primary dark:group-hover:text-blue-200">{t('categories.createNew')}</span>
                                </div>

                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-between rounded-b-lg">
                        <div className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                            {t('common.showing')} <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {totalItems > 0 ? ((page - 1) * limit) + 1 : 0}-{Math.min(page * limit, totalItems)}
                            </span> {t('common.of')} <span className="font-semibold text-slate-700 dark:text-slate-200">{totalItems}</span> {t('common.data')}
                        </div>

                        <div className="flex items-center space-x-2">
                            {renderPaginationButtons()}
                        </div>
                    </div>
                </div>
            </div>


            {/* Edit Kategori Dialog */}
            <Dialog open={!!editingKategori} onOpenChange={(open) => !open && setEditingKategori(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('categories.editTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('categories.editDesc')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-nama-kategori">{t('categories.name')}</Label>
                            <Input
                                id="edit-nama-kategori"
                                className="col-span-3 bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                value={editForm.nama || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, nama: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-deskripsi-kategori">{t('categories.description')}</Label>
                            <Input
                                id="edit-deskripsi-kategori"
                                className="col-span-3 bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                value={editForm.deskripsi || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, deskripsi: e.target.value }))}
                            />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingKategori(null)} className='cursor-pointer'>{t('common.cancel')}</Button>
                        <Button
                            type="submit"
                            className="bg-primary hover:bg-primary/90 dark:text-white cursor-pointer"
                            onClick={handleUpdateKategori}
                            disabled={updating}
                        >
                            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('categories.saveChanges')}
                        </Button>
                    </DialogFooter>

                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingKategori} onOpenChange={(open) => !open && setDeletingKategori(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            {t('categories.deleteTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('categories.deleteConfirm', { name: deletingKategori?.nama || '' })}
                            {deletingKategori?._count?.alat && deletingKategori._count.alat > 0 && (
                                <span className="block mt-2 text-amber-600 font-medium">
                                    {t('categories.deleteWarning', { count: deletingKategori._count.alat })}
                                </span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeletingKategori(null)} className='cursor-pointer'>{t('common.cancel')}</Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                            onClick={handleDeleteKategori}
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
                            <span className="dark:text-slate-100">Export Data Kategori</span>
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
                            <span className="dark:text-slate-100">Import Data Kategori</span>
                        </DialogTitle>
                        <DialogDescription className="dark:text-slate-400">
                            {importStep === 'upload' && 'Upload file CSV atau Excel untuk import data kategori.'}
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
                                    id="import-file-upload"
                                />
                                <label htmlFor="import-file-upload" className="cursor-pointer">
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
                                <div className="space-y-4">
                                    {/* Nama Kategori Mapping */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-32 text-slate-700 dark:text-slate-200 font-medium">
                                            Nama Kategori <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="flex-1">
                                            <Select
                                                value={columnMapping.nama || undefined}
                                                onValueChange={(value) => setColumnMapping(prev => ({ ...prev, nama: value }))}
                                            >
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
                                    {/* Deskripsi Mapping */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-32 text-slate-700 dark:text-slate-200 font-medium">
                                            Deskripsi
                                        </Label>
                                        <div className="flex-1">
                                            <Select
                                                value={columnMapping.deskripsi || "skip_column_option"}
                                                onValueChange={(value) => setColumnMapping(prev => ({ ...prev, deskripsi: value === 'skip_column_option' ? '' : value }))}
                                            >
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700 focus:ring-primary dark:focus:ring-slate-500">
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
                                    <p className="text-sm text-amber-700 dark:text-amber-400">Kolom Nama Kategori wajib dipilih</p>
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
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Nama Kategori</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Deskripsi</th>
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
                                                        {columnMapping.deskripsi ? row[columnMapping.deskripsi] : '-'}
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
        </div >
    )
}
