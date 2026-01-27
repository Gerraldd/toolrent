'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
    Plus,
    Search,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Shield,
    UserCog,
    Users,
    Settings,
    Upload,
    Download,
    FileSpreadsheet,
    FileText,
    CheckCircle,
    AlertTriangle,
    FileUp,
    X,
    Camera
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
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-users'
import { User, CreateUserInput, UpdateUserInput } from '@/lib/api-client'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/language-context'
import { Counter } from '@/components/ui/counter'
import * as XLSX from 'xlsx'

export default function UsersPage() {
    const { t } = useLanguage()
    // State for search and filters
    const [searchValue, setSearchValue] = useState('')
    const [roleFilter, setRoleFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    // Dialog states
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<User | null>(null)
    const [deletingUser, setDeletingUser] = useState<User | null>(null)

    // Available export columns
    const exportColumns = [
        { key: 'no', label: 'No' },
        { key: 'nama', label: 'Nama' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'noTelepon', label: 'No. Telepon' },
        { key: 'alamat', label: 'Alamat' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Tanggal Daftar' }
    ]

    // State for selected export columns
    const [selectedColumns, setSelectedColumns] = useState<string[]>(['no', 'nama', 'email', 'role', 'status'])

    // Import states
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
    const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
    const [importFile, setImportFile] = useState<File | null>(null)
    const [importFileHeaders, setImportFileHeaders] = useState<string[]>([])
    const [importFileData, setImportFileData] = useState<Record<string, string>[]>([])
    const [columnMapping, setColumnMapping] = useState<{ nama: string; email: string; password: string; role: string; noTelepon: string; alamat: string; status: string }>({
        nama: '', email: '', password: '', role: '', noTelepon: '', alamat: '', status: ''
    })
    const [importing, setImporting] = useState(false)
    const [duplicateRows, setDuplicateRows] = useState<{ row: number; email: string }[]>([])
    const [uploadingImage, setUploadingImage] = useState(false)

    // Form states for Add User
    const [addForm, setAddForm] = useState<CreateUserInput>({
        nama: '',
        email: '',
        password: '',
        role: 'peminjam',
        noTelepon: '',
        alamat: '',
        status: 'aktif',
        image: ''
    })

    // Form states for Edit User
    const [editForm, setEditForm] = useState<UpdateUserInput>({})

    // Use hooks
    const {
        users,
        loading,
        pagination,
        refetch,
        setPage,
        setSearch,
        setRoleFilter: setRoleFilterHook,
        setStatusFilter: setStatusFilterHook
    } = useUsers()

    const { createUser, loading: creating } = useCreateUser(() => {
        setIsAddDialogOpen(false)
        resetAddForm()
        refetch()
    })

    const { updateUser, loading: updating } = useUpdateUser(() => {
        setEditingUser(null)
        refetch()
    })

    const { deleteUser, loading: deleting } = useDeleteUser(() => {
        setDeletingUser(null)
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
        setRoleFilterHook(roleFilter)
    }, [roleFilter, setRoleFilterHook])

    useEffect(() => {
        setStatusFilterHook(statusFilter)
    }, [statusFilter, setStatusFilterHook])

    // Reset add form
    const resetAddForm = () => {
        setAddForm({
            nama: '',
            email: '',
            password: '',
            role: 'peminjam',
            noTelepon: '',
            alamat: '',
            status: 'aktif',
            image: ''
        })
    }

    // Handle image upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean = false) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate max size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Ukuran file maksimal 2MB')
            return
        }

        setUploadingImage(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'profiles')

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            const result = await response.json()

            if (result.success) {
                if (isEdit) {
                    setEditForm(prev => ({ ...prev, image: result.data.url }))
                } else {
                    setAddForm(prev => ({ ...prev, image: result.data.url }))
                }
                toast.success('Foto profil berhasil diupload')
            } else {
                toast.error(result.error || 'Gagal mengupload gambar')
            }
        } catch (error) {
            toast.error('Terjadi kesalahan saat upload')
        } finally {
            setUploadingImage(false)
        }
    }

    // Handle add user submit
    const handleAddUser = async () => {
        if (!addForm.nama || !addForm.email || !addForm.password) {
            return
        }

        // Validate password length
        if (addForm.password.length < 6) {
            toast.error(t('users.passwordValidation'))
            return
        }

        await createUser(addForm)
    }

    // Handle edit user
    const handleEditClick = (user: User) => {
        setEditingUser(user)
        setEditForm({
            nama: user.nama,
            email: user.email,
            role: user.role,
            noTelepon: user.noTelepon || '',
            alamat: user.alamat || '',
            status: user.status,
            image: user.image || ''
        })
    }

    // Handle update user submit
    const handleUpdateUser = async () => {
        if (!editingUser) return

        // Validate password length if provided
        if (editForm.password && editForm.password.length < 6) {
            toast.error(t('users.passwordValidation'))
            return
        }

        await updateUser(editingUser.id, editForm)
    }

    // Handle delete user
    const handleDeleteUser = async () => {
        if (!deletingUser) return
        await deleteUser(deletingUser.id)
    }

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

    // Format role for export
    const formatRole = (role: string) => {
        switch (role) {
            case 'admin': return 'Administrator'
            case 'petugas': return 'Petugas'
            case 'peminjam': return 'Peminjam'
            default: return role
        }
    }

    // Format status for export
    const formatStatus = (status: string) => {
        return status === 'aktif' ? 'Aktif' : 'Nonaktif'
    }

    // Format date for export
    const formatDateExport = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    // Export handlers
    const handleExportCSV = () => {
        if (selectedColumns.length === 0) return

        const headers = exportColumns
            .filter(c => selectedColumns.includes(c.key))
            .map(c => c.label)

        const rows = users.map((user, index) => {
            const row: (string | number)[] = []
            if (selectedColumns.includes('no')) row.push(index + 1)
            if (selectedColumns.includes('nama')) row.push(user.nama)
            if (selectedColumns.includes('email')) row.push(user.email)
            if (selectedColumns.includes('role')) row.push(formatRole(user.role))
            if (selectedColumns.includes('noTelepon')) row.push(user.noTelepon || '-')
            if (selectedColumns.includes('alamat')) row.push(user.alamat || '-')
            if (selectedColumns.includes('status')) row.push(formatStatus(user.status))
            if (selectedColumns.includes('createdAt')) row.push(formatDateExport(user.createdAt))
            return row
        })

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `Data_Users_${new Date().toISOString().split('T')[0]}.csv`
        link.click()
        setIsExportDialogOpen(false)
    }

    const handleExportExcel = () => {
        if (selectedColumns.length === 0) return

        const data = users.map((user, index) => {
            const row: Record<string, string | number> = {}
            if (selectedColumns.includes('no')) row['No'] = index + 1
            if (selectedColumns.includes('nama')) row['Nama'] = user.nama
            if (selectedColumns.includes('email')) row['Email'] = user.email
            if (selectedColumns.includes('role')) row['Role'] = formatRole(user.role)
            if (selectedColumns.includes('noTelepon')) row['No. Telepon'] = user.noTelepon || '-'
            if (selectedColumns.includes('alamat')) row['Alamat'] = user.alamat || '-'
            if (selectedColumns.includes('status')) row['Status'] = formatStatus(user.status)
            if (selectedColumns.includes('createdAt')) row['Tanggal Daftar'] = formatDateExport(user.createdAt)
            return row
        })

        const worksheet = XLSX.utils.json_to_sheet(data)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Users')
        XLSX.writeFile(workbook, `Data_Users_${new Date().toISOString().split('T')[0]}.xlsx`)
        setIsExportDialogOpen(false)
    }

    // Import handlers
    const resetImport = () => {
        setImportStep('upload')
        setImportFile(null)
        setImportFileHeaders([])
        setImportFileData([])
        setColumnMapping({ nama: '', email: '', password: '', role: '', noTelepon: '', alamat: '', status: '' })
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
                const emailMatch = headers.find(h =>
                    h.toLowerCase().includes('email') ||
                    h.toLowerCase().includes('mail')
                )
                const passwordMatch = headers.find(h =>
                    h.toLowerCase().includes('password') ||
                    h.toLowerCase().includes('kata sandi')
                )
                const roleMatch = headers.find(h =>
                    h.toLowerCase().includes('role') ||
                    h.toLowerCase().includes('peran')
                )
                const teleponMatch = headers.find(h =>
                    h.toLowerCase().includes('telepon') ||
                    h.toLowerCase().includes('phone') ||
                    h.toLowerCase().includes('hp')
                )
                const alamatMatch = headers.find(h =>
                    h.toLowerCase().includes('alamat') ||
                    h.toLowerCase().includes('address')
                )
                const statusMatch = headers.find(h =>
                    h.toLowerCase().includes('status')
                )

                setColumnMapping({
                    nama: namaMatch || '',
                    email: emailMatch || '',
                    password: passwordMatch || '',
                    role: roleMatch || '',
                    noTelepon: teleponMatch || '',
                    alamat: alamatMatch || '',
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
        if (!columnMapping.nama || !columnMapping.email) {
            return
        }

        setImporting(true)
        setDuplicateRows([])

        try {
            // Check for duplicates first
            const existingEmails = new Set(users.map(u => u.email.toLowerCase()))
            const duplicates: { row: number; email: string }[] = []
            const seenEmails = new Set<string>()

            importFileData.forEach((row, index) => {
                const email = row[columnMapping.email]?.trim().toLowerCase()
                if (email) {
                    if (existingEmails.has(email) || seenEmails.has(email)) {
                        duplicates.push({ row: index + 1, email })
                    }
                    seenEmails.add(email)
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
                email: row[columnMapping.email] || '',
                password: row[columnMapping.password] || '',
                role: row[columnMapping.role] || '',
                noTelepon: row[columnMapping.noTelepon] || '',
                alamat: row[columnMapping.alamat] || '',
                status: row[columnMapping.status] || ''
            })).filter(item => item.nama.trim() !== '' && item.email.trim() !== '')

            if (importData.length === 0) {
                setImporting(false)
                return
            }

            const res = await fetch('/api/users/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: importData })
            })

            const result = await res.json()

            if (result.success) {
                toast.success(`${result.data.imported} user berhasil diimport`)
                setIsImportDialogOpen(false)
                resetImport()
                refetch()
            } else {
                if (result.duplicates && result.duplicates.length > 0) {
                    setDuplicateRows(result.duplicates.map((email: string, idx: number) => ({ row: idx + 1, email })))
                }
                toast.error(result.error || 'Gagal import data')
            }
        } catch (error) {
            console.error('Import error:', error)
            toast.error('Terjadi kesalahan saat import')
        } finally {
            setImporting(false)
        }
    }

    // Generate pagination buttons
    const renderPaginationButtons = () => {
        const { page, totalPages } = pagination
        const buttons = []

        // Previous button
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

        // Page numbers
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

        // Next button
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

    // Format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const formattedDate = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
        return t('users.joined', { date: formattedDate })
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
                                <Users className="h-6 w-6 text-primary dark:text-blue-200" />
                                {t('users.title')}
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                {t('users.subtitle')}
                            </p>
                        </div>

                        {/* Add User Dialog */}
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 dark:shadow-none transition-all rounded-md cursor-pointer">
                                    <Plus className="mr-2 h-5 w-5" />
                                    {t('users.addUser')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>{t('users.addTitle')}</DialogTitle>
                                    <DialogDescription>
                                        {t('users.addDesc')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    {/* Profile Picture Upload */}
                                    <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                                        <div className="relative group">
                                            <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-800 shadow-lg">
                                                <AvatarImage src={addForm.image || undefined} className="object-cover" />
                                                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                                                    {addForm.nama?.substring(0, 2).toUpperCase() || 'US'}
                                                </AvatarFallback>
                                            </Avatar>
                                            <label
                                                htmlFor="add-image-upload"
                                                className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-all border-2 border-white dark:border-slate-800"
                                            >
                                                {uploadingImage ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Camera className="h-4 w-4" />
                                                )}
                                                <input
                                                    type="file"
                                                    id="add-image-upload"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(e, false)}
                                                    disabled={uploadingImage}
                                                />
                                            </label>
                                            {addForm.image && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAddForm(prev => ({ ...prev, image: '' }))
                                                    }}
                                                    className="absolute bottom-0 left-0 p-1.5 bg-red-500 text-white rounded-full shadow-lg cursor-pointer hover:bg-red-600 transition-all border-2 border-white dark:border-slate-800"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-name">{t('users.name')}</Label>
                                        <Input
                                            id="add-name"
                                            className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                            placeholder={t('users.namePlaceholder')}
                                            value={addForm.nama}
                                            onChange={(e) => setAddForm(prev => ({ ...prev, nama: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-email">{t('users.email')}</Label>
                                        <Input
                                            id="add-email"
                                            type="email"
                                            className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                            placeholder={t('users.emailPlaceholder')}
                                            value={addForm.email}
                                            onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-password">{t('users.password')}</Label>
                                        <Input
                                            id="add-password"
                                            type="password"
                                            className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                            placeholder={t('users.passwordHint')}
                                            value={addForm.password}
                                            onChange={(e) => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="add-role">{t('users.role')}</Label>
                                            <Select
                                                value={addForm.role}
                                                onValueChange={(value) => setAddForm(prev => ({ ...prev, role: value as 'admin' | 'petugas' | 'peminjam' }))}
                                            >
                                                <SelectTrigger id="add-role" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                                    <SelectValue placeholder={t('users.selectRole')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="peminjam">{t('users.role.peminjam')}</SelectItem>
                                                    <SelectItem value="petugas">{t('users.role.petugas')}</SelectItem>
                                                    <SelectItem value="admin">{t('users.role.admin')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="add-status">{t('common.status')}</Label>
                                            <Select
                                                value={addForm.status}
                                                onValueChange={(value) => setAddForm(prev => ({ ...prev, status: value as 'aktif' | 'nonaktif' }))}
                                            >
                                                <SelectTrigger id="add-status" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                                    <SelectValue placeholder={t('users.selectStatus')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="aktif">{t('users.status.active')}</SelectItem>
                                                    <SelectItem value="nonaktif">{t('users.status.inactive')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="add-phone">{t('users.phone')} {t('users.optional')}</Label>
                                        <Input
                                            id="add-phone"
                                            className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                            placeholder={t('users.phonePlaceholder')}
                                            value={addForm.noTelepon}
                                            onChange={(e) => setAddForm(prev => ({ ...prev, noTelepon: e.target.value }))}
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
                                        onClick={handleAddUser}
                                        disabled={creating || !addForm.nama || !addForm.email || !addForm.password}
                                    >
                                        {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t('users.save')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {/* Role Summary Cards */}
                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100 dark:border-slate-700">
                        {/* Administrator Card */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
                                    <Shield className="h-6 w-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('users.role.admin')}</p>
                                <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">
                                    <Counter value={users.filter(u => u.role === 'admin').length} />
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('users.roleDesc.admin')}</p>
                            </div>
                        </div>

                        {/* Petugas Card */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400">
                                    <UserCog className="h-6 w-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('users.role.petugas')}</p>
                                <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">
                                    <Counter value={users.filter(u => u.role === 'petugas').length} />
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('users.roleDesc.petugas')}</p>
                            </div>
                        </div>

                        {/* Peminjam Card */}
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                    <Users className="h-6 w-6" />
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('users.role.peminjam')}</p>
                                <h3 className="text-3xl font-bold mt-1 text-slate-900 dark:text-white">
                                    <Counter value={users.filter(u => u.role === 'peminjam').length} />
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('users.roleDesc.peminjam')}</p>
                            </div>
                        </div>
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
                                placeholder={t('users.searchPlaceholder')}
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                            />
                        </div>

                        {/* Filters */}
                        <div className="md:w-48 lg:w-56">
                            <Select
                                value={roleFilter || undefined}
                                onValueChange={(value) => setRoleFilter(value === "all" ? "" : value)}
                            >
                                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                    <SelectValue placeholder={t('users.selectRole')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('users.selectRole')}</SelectItem>
                                    <SelectItem value="admin">{t('users.role.admin')}</SelectItem>
                                    <SelectItem value="petugas">{t('users.role.petugas')}</SelectItem>
                                    <SelectItem value="peminjam">{t('users.role.peminjam')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:w-48 lg:w-56">
                            <Select
                                value={statusFilter || undefined}
                                onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
                            >
                                <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                    <SelectValue placeholder={t('users.selectStatus')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('users.selectStatus')}</SelectItem>
                                    <SelectItem value="aktif">{t('users.status.active')}</SelectItem>
                                    <SelectItem value="nonaktif">{t('users.status.inactive')}</SelectItem>
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

                    {/* Table Container */}
                    <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 relative min-h-[460px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : users.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                                <p className="text-lg font-medium">{t('users.noData')}</p>
                                <p className="text-sm">{t('users.noDataDesc')}</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20">ID</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('activityLog.header.user')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('users.email')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('users.role')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('common.status')}</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{t('common.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {users.map((user, index) => (
                                        <tr
                                            key={user.id}
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group ${index % 2 === 1 ? 'bg-slate-50/30 dark:bg-slate-800/30' : ''}`}
                                        >
                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">#{String(user.id).padStart(3, '0')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">

                                                    <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-600">
                                                        <AvatarImage src={user.image || undefined} className="object-cover" />
                                                        <AvatarFallback className="bg-primary/10 dark:bg-slate-700 text-primary dark:text-blue-200 font-bold">
                                                            {user.nama.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">{user.nama}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{formatDate(user.createdAt)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.role === 'admin' && (
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                        {t('users.role.admin')}
                                                    </span>
                                                )}
                                                {user.role === 'petugas' && (
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                                                        {t('users.role.petugas')}
                                                    </span>
                                                )}
                                                {user.role === 'peminjam' && (
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                        {t('users.role.peminjam')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className={`h-2.5 w-2.5 rounded-full ${user.status === 'aktif' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                                        {user.status === 'aktif' ? t('users.status.active') : t('users.status.inactive')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                <div className="flex justify-center gap-1">
                                                    {/* Edit Button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:text-blue-600 dark:hover:text-blue-400 text-blue-500 hover:bg-blue-50"
                                                        onClick={() => handleEditClick(user)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>

                                                    {/* Delete Button */}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 hover:text-red-600 dark:hover:text-red-400 text-red-500 hover:bg-red-50"
                                                        onClick={() => setDeletingUser(user)}
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
                                {users.length > 0 ? ((pagination.page - 1) * pagination.limit) + 1 : 0}-{Math.min(pagination.page * pagination.limit, pagination.total)}
                            </span> {t('common.of')} <span className="font-semibold text-slate-700 dark:text-slate-200">{pagination.total}</span> {t('common.data')}
                        </div>
                        <div className="flex items-center space-x-2">
                            {renderPaginationButtons()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit User Dialog */}
            <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{t('users.editTitle')}</DialogTitle>
                        <DialogDescription>
                            {t('users.editDesc')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 text-left">
                        {/* Profile Picture Upload */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                            <div className="relative group">
                                <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-800 shadow-lg">
                                    <AvatarImage src={editForm.image || undefined} className="object-cover" />
                                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                                        {editForm.nama?.substring(0, 2).toUpperCase() || 'US'}
                                    </AvatarFallback>
                                </Avatar>
                                <label
                                    htmlFor="edit-image-upload"
                                    className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-all border-2 border-white dark:border-slate-800"
                                >
                                    {uploadingImage ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Camera className="h-4 w-4" />
                                    )}
                                    <input
                                        type="file"
                                        id="edit-image-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(e, true)}
                                        disabled={uploadingImage}
                                    />
                                </label>
                                {editForm.image && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditForm(prev => ({ ...prev, image: '' }))
                                        }}
                                        className="absolute bottom-0 left-0 p-1.5 bg-red-500 text-white rounded-full shadow-lg cursor-pointer hover:bg-red-600 transition-all border-2 border-white dark:border-slate-800"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">{t('users.name')}</Label>
                            <Input
                                id="edit-name"
                                className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                value={editForm.nama || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, nama: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">{t('users.email')}</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                value={editForm.email || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-password">{t('users.passwordEditHint')}</Label>
                            <Input
                                id="edit-password"
                                type="password"
                                placeholder="••••••••"
                                className="bg-white dark:bg-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
                                value={editForm.password || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-role">{t('users.role')}</Label>
                                <Select
                                    value={editForm.role || ''}
                                    onValueChange={(value) => setEditForm(prev => ({ ...prev, role: value as 'admin' | 'petugas' | 'peminjam' }))}
                                >
                                    <SelectTrigger id="edit-role" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                        <SelectValue placeholder={t('users.selectRole')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="peminjam">{t('users.role.peminjam')}</SelectItem>
                                        <SelectItem value="petugas">{t('users.role.petugas')}</SelectItem>
                                        <SelectItem value="admin">{t('users.role.admin')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-status">{t('common.status')}</Label>
                                <Select
                                    value={editForm.status || ''}
                                    onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value as 'aktif' | 'nonaktif' }))}
                                >
                                    <SelectTrigger id="edit-status" className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 dark:text-slate-200">
                                        <SelectValue placeholder={t('users.selectStatus')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="aktif">{t('users.status.active')}</SelectItem>
                                        <SelectItem value="nonaktif">{t('users.status.inactive')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="cursor-pointer" onClick={() => setEditingUser(null)}>{t('common.cancel')}</Button>
                        <Button
                            type="submit"
                            className="bg-primary hover:bg-primary/90 dark:text-white cursor-pointer"
                            onClick={handleUpdateUser}
                            disabled={updating}
                        >
                            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('users.saveChanges')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" />
                            {t('users.deleteTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('users.deleteConfirm', { name: deletingUser?.nama || '' })}
                            {t('users.deleteWarning')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" className="cursor-pointer" onClick={() => setDeletingUser(null)}>{t('common.cancel')}</Button>
                        <Button
                            variant="destructive"
                            className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                            onClick={handleDeleteUser}
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
                            <span className="dark:text-slate-100">Export Data User</span>
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
                            <span className="dark:text-slate-100">Import Data User</span>
                        </DialogTitle>
                        <DialogDescription className="dark:text-slate-400">
                            {importStep === 'upload' && 'Upload file CSV atau Excel untuk import data user.'}
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
                                    id="import-user-file-upload"
                                />
                                <label htmlFor="import-user-file-upload" className="cursor-pointer">
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
                            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-2xl p-3 border border-amber-200 dark:border-amber-900/50">
                                <p className="text-sm text-amber-700 dark:text-amber-400">
                                    <strong>Catatan:</strong> User yang diimport tanpa password akan mendapat password default: <code className="bg-amber-100 dark:bg-amber-900/30 px-1 rounded">password123</code>
                                </p>
                            </div>
                        </div>
                    )}

                    {importStep === 'mapping' && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                    Cocokkan kolom dari file dengan field yang diperlukan:
                                </p>
                                <div className="space-y-3">
                                    {/* Nama Mapping */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium">
                                            Nama <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="flex-1">
                                            <Select
                                                value={columnMapping.nama || undefined}
                                                onValueChange={(value) => setColumnMapping(prev => ({ ...prev, nama: value }))}
                                            >
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700">
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
                                    {/* Email Mapping */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium">
                                            Email <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="flex-1">
                                            <Select
                                                value={columnMapping.email || undefined}
                                                onValueChange={(value) => setColumnMapping(prev => ({ ...prev, email: value }))}
                                            >
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700">
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
                                    {/* Password Mapping */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium">Password</Label>
                                        <div className="flex-1">
                                            <Select
                                                value={columnMapping.password || "skip_column_option"}
                                                onValueChange={(value) => setColumnMapping(prev => ({ ...prev, password: value === 'skip_column_option' ? '' : value }))}
                                            >
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700">
                                                    <SelectValue placeholder="-- Opsional --" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="skip_column_option">-- Opsional --</SelectItem>
                                                    {importFileHeaders.map(header => (
                                                        <SelectItem key={header} value={header}>{header}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Role Mapping */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium">Role</Label>
                                        <div className="flex-1">
                                            <Select
                                                value={columnMapping.role || "skip_column_option"}
                                                onValueChange={(value) => setColumnMapping(prev => ({ ...prev, role: value === 'skip_column_option' ? '' : value }))}
                                            >
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700">
                                                    <SelectValue placeholder="-- Opsional --" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="skip_column_option">-- Opsional (default: peminjam) --</SelectItem>
                                                    {importFileHeaders.map(header => (
                                                        <SelectItem key={header} value={header}>{header}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* No Telepon Mapping */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium">No. Telepon</Label>
                                        <div className="flex-1">
                                            <Select
                                                value={columnMapping.noTelepon || "skip_column_option"}
                                                onValueChange={(value) => setColumnMapping(prev => ({ ...prev, noTelepon: value === 'skip_column_option' ? '' : value }))}
                                            >
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700">
                                                    <SelectValue placeholder="-- Opsional --" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="skip_column_option">-- Opsional --</SelectItem>
                                                    {importFileHeaders.map(header => (
                                                        <SelectItem key={header} value={header}>{header}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Status Mapping */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <Label className="w-28 text-slate-700 dark:text-slate-200 font-medium">Status</Label>
                                        <div className="flex-1">
                                            <Select
                                                value={columnMapping.status || "skip_column_option"}
                                                onValueChange={(value) => setColumnMapping(prev => ({ ...prev, status: value === 'skip_column_option' ? '' : value }))}
                                            >
                                                <SelectTrigger className="w-full bg-white dark:bg-slate-950 dark:text-white border-slate-300 dark:border-slate-700">
                                                    <SelectValue placeholder="-- Opsional --" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="skip_column_option">-- Opsional (default: aktif) --</SelectItem>
                                                    {importFileHeaders.map(header => (
                                                        <SelectItem key={header} value={header}>{header}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {(!columnMapping.nama || !columnMapping.email) && (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-900/50">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                                    <p className="text-sm text-amber-700 dark:text-amber-400">Kolom Nama dan Email wajib dipilih</p>
                                </div>
                            )}
                        </div>
                    )}

                    {importStep === 'preview' && (
                        <div className="space-y-4 max">
                            {/* Duplicate Warning */}
                            {duplicateRows.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-2xl p-4 border border-red-200 dark:border-red-900/50">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                                Import gagal! {duplicateRows.length} email sudah terdaftar:
                                            </p>
                                            <div className="mt-2 text-xs text-red-600 dark:text-red-400 space-y-1 max-h-20 overflow-y-auto">
                                                {duplicateRows.slice(0, 5).map((dup, idx) => (
                                                    <p key={idx}>Baris {dup.row}: "{dup.email}"</p>
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
                                <div className="max-w-[517px] max-h-[300px] overflow-auto relative border border-slate-200 dark:border-slate-700 rounded-md">
                                    <table className="w-full text-sm border-collapse">
                                        <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">#</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Nama</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Email</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Password</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Role</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">No. Telepon</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Alamat</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700 dark:text-slate-300">Status</th>
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
                                                        {columnMapping.email ? row[columnMapping.email] : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                                        {columnMapping.password ? (row[columnMapping.password] ? '••••••' : 'default') : 'default'}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                                        {columnMapping.role ? row[columnMapping.role] || 'peminjam' : 'peminjam'}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                                        {columnMapping.noTelepon ? row[columnMapping.noTelepon] || '-' : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-[150px] truncate">
                                                        {columnMapping.alamat ? row[columnMapping.alamat] || '-' : '-'}
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                                                        {columnMapping.status ? row[columnMapping.status] || 'aktif' : 'aktif'}
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
                                    disabled={!columnMapping.nama || !columnMapping.email}
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
