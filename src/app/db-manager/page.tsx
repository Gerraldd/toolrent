'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    Database,
    Plus,
    Upload,
    Key,
    Download,
    Copy,
    Trash2,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Eye,
    EyeOff,
    Sun,
    Moon,
    Monitor,
    Lock,
    ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DatabaseInfo {
    name: string
    size: string
    sizeBytes: number
    connections: number
    hasValidSchema?: boolean
}

export default function DatabaseManagerPage() {
    const router = useRouter()
    const { setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const [databases, setDatabases] = useState<DatabaseInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDb, setSelectedDb] = useState<string | null>(null)
    const [currentDatabase, setCurrentDatabase] = useState<string | null>(null)
    const [selectingDb, setSelectingDb] = useState<string | null>(null)

    // Authentication state for page access
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [accessPassword, setAccessPassword] = useState('')
    const [showAccessPassword, setShowAccessPassword] = useState(false)
    const [verifying, setVerifying] = useState(false)

    // Modals
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
    const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
    const [backupDialogOpen, setBackupDialogOpen] = useState(false)

    // Form states
    const [masterPassword, setMasterPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [newDbName, setNewDbName] = useState('')
    const [adminEmail, setAdminEmail] = useState('')
    const [adminPassword, setAdminPassword] = useState('')
    const [showAdminPassword, setShowAdminPassword] = useState(false)
    const [newPasswordForSet, setNewPasswordForSet] = useState('')
    const [confirmNewPassword, setConfirmNewPassword] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    const [processing, setProcessing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Verify access password to enter DB Manager
    const handleVerifyAccess = async () => {
        if (!accessPassword) {
            toast.error('Masukkan master password')
            return
        }

        setVerifying(true)
        try {
            const response = await fetch('/api/db-manager/verify-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: accessPassword })
            })
            const data = await response.json()

            if (data.success) {
                setIsAuthenticated(true)
                toast.success('Akses diberikan')
            } else {
                toast.error(data.error || 'Password salah')
            }
        } catch (error) {
            toast.error('Gagal memverifikasi password')
        } finally {
            setVerifying(false)
        }
    }

    // Fetch databases
    const fetchDatabases = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/db-manager/list')
            const data = await response.json()
            if (data.success) {
                // Only show databases with valid schema
                setDatabases(data.databases.filter((db: DatabaseInfo) => db.hasValidSchema !== false))
            } else {
                toast.error(data.error || 'Failed to load databases')
            }
        } catch (error) {
            toast.error('Failed to connect to database server')
        } finally {
            setLoading(false)
        }
    }

    // Fetch selected database from cookie
    const fetchSelectedDatabase = async () => {
        try {
            const response = await fetch('/api/db-manager/selected')
            const data = await response.json()
            if (data.success && data.selectedDatabase) {
                setCurrentDatabase(data.selectedDatabase)
            }
        } catch (error) {
            console.error('Failed to fetch selected database')
        }
    }

    useEffect(() => {
        if (isAuthenticated) {
            fetchDatabases()
            fetchSelectedDatabase()
        } else {
            setLoading(false)
        }
    }, [isAuthenticated])

    // Handle database click - select and redirect to login
    const handleSelectDatabase = async (dbName: string) => {
        setSelectingDb(dbName)
        try {
            const response = await fetch('/api/db-manager/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ databaseName: dbName })
            })
            const data = await response.json()
            if (data.success) {
                toast.success(`Database "${dbName}" selected`)
                router.push('/login')
            } else {
                toast.error(data.error)
                setSelectingDb(null)
            }
        } catch (error) {
            toast.error('Failed to select database')
            setSelectingDb(null)
        }
    }

    // Handle backup
    const handleBackup = async () => {
        if (!selectedDb || !masterPassword) {
            toast.error('Please enter master password')
            return
        }

        setProcessing(true)
        try {
            const response = await fetch(`/api/db-manager/backup?database=${encodeURIComponent(selectedDb)}&masterPassword=${encodeURIComponent(masterPassword)}`)

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Backup failed')
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${selectedDb}_backup_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.sql`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            a.remove()

            toast.success(`Backup of "${selectedDb}" downloaded successfully`)
            setBackupDialogOpen(false)
            setMasterPassword('')
            setSelectedDb(null)
        } catch (error: any) {
            toast.error(error.message || 'Failed to backup database')
        } finally {
            setProcessing(false)
        }
    }

    // Handle create database
    const handleCreate = async () => {
        if (!newDbName || !adminEmail || !adminPassword || !masterPassword) {
            toast.error('Please fill in all fields')
            return
        }

        setProcessing(true)
        try {
            const response = await fetch('/api/db-manager/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    masterPassword,
                    databaseName: newDbName,
                    adminEmail,
                    adminPassword
                })
            })
            const data = await response.json()

            if (data.success) {
                toast.success(`Database "${newDbName}" created successfully`)
                setCreateDialogOpen(false)
                resetCreateForm()
                fetchDatabases()
            } else {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error('Failed to create database')
        } finally {
            setProcessing(false)
        }
    }

    // Handle delete database
    const handleDelete = async () => {
        if (!selectedDb || !masterPassword) {
            toast.error('Please enter master password')
            return
        }

        setProcessing(true)
        try {
            const response = await fetch('/api/db-manager/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    masterPassword,
                    databaseName: selectedDb
                })
            })
            const data = await response.json()

            if (data.success) {
                toast.success(`Database "${selectedDb}" deleted successfully`)
                setDeleteDialogOpen(false)
                setMasterPassword('')
                setSelectedDb(null)
                fetchDatabases()
            } else {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error('Failed to delete database')
        } finally {
            setProcessing(false)
        }
    }

    // Handle duplicate database
    const handleDuplicate = async () => {
        if (!selectedDb || !newDbName || !masterPassword) {
            toast.error('Please fill in all fields')
            return
        }

        setProcessing(true)
        try {
            const response = await fetch('/api/db-manager/duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    masterPassword,
                    sourceDatabaseName: selectedDb,
                    newDatabaseName: newDbName
                })
            })
            const data = await response.json()

            if (data.success) {
                toast.success(`Database duplicated as "${newDbName}"`)
                setDuplicateDialogOpen(false)
                setMasterPassword('')
                setNewDbName('')
                setSelectedDb(null)
                fetchDatabases()
            } else {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error('Failed to duplicate database')
        } finally {
            setProcessing(false)
        }
    }

    // Handle restore database
    const handleRestore = async () => {
        if (!newDbName || !selectedFile || !masterPassword) {
            toast.error('Please fill in all fields')
            return
        }

        setProcessing(true)
        try {
            const formData = new FormData()
            formData.append('masterPassword', masterPassword)
            formData.append('databaseName', newDbName)
            formData.append('file', selectedFile)

            const response = await fetch('/api/db-manager/restore', {
                method: 'POST',
                body: formData
            })
            const data = await response.json()

            if (data.success) {
                toast.success(`Database "${newDbName}" restored successfully`)
                setRestoreDialogOpen(false)
                setMasterPassword('')
                setNewDbName('')
                setSelectedFile(null)
                fetchDatabases()
            } else {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error('Failed to restore database')
        } finally {
            setProcessing(false)
        }
    }

    // Handle set password
    const handleSetPassword = async () => {
        if (!masterPassword || !newPasswordForSet || !confirmNewPassword) {
            toast.error('Please fill in all fields')
            return
        }

        if (newPasswordForSet !== confirmNewPassword) {
            toast.error('New passwords do not match')
            return
        }

        setProcessing(true)
        try {
            const response = await fetch('/api/db-manager/set-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: masterPassword,
                    newPassword: newPasswordForSet
                })
            })
            const data = await response.json()

            if (data.success) {
                toast.success('Master password updated successfully')
                setPasswordDialogOpen(false)
                setMasterPassword('')
                setNewPasswordForSet('')
                setConfirmNewPassword('')
            } else {
                toast.error(data.error)
            }
        } catch (error) {
            toast.error('Failed to update master password')
        } finally {
            setProcessing(false)
        }
    }

    // Reset create form
    const resetCreateForm = () => {
        setMasterPassword('')
        setNewDbName('')
        setAdminEmail('')
        setAdminPassword('')
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
            {/* Login Button - Top Left */}
            <div className="absolute top-4 left-4 z-50">
                <button
                    onClick={() => router.push('/login')}
                    className="flex h-9 items-center gap-2 px-3 rounded-md bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">Login</span>
                </button>
            </div>

            {/* Theme Switcher - Top Right */}
            <div className="absolute top-4 right-4 z-50 flex gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex h-9 w-9 items-center justify-center rounded-md bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-sm">
                            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                            <span className="sr-only">Toggle theme</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                            <Sun className="mr-2 h-4 w-4" />
                            <span>Terang</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                            <Moon className="mr-2 h-4 w-4" />
                            <span>Gelap</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                            <Monitor className="mr-2 h-4 w-4" />
                            <span>Sistem</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Header */}
            <div className="bg-primary py-8 shadow-lg">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex items-center justify-center gap-3">
                        <Database className="h-10 w-10 text-white" />
                        <h1 className="text-3xl font-bold text-white">
                            Sistem Peminjaman Alat
                        </h1>
                    </div>
                    <p className="text-center text-white/80 mt-2">
                        Database Manager
                    </p>
                </div>
            </div>

            {/* Password Gate - Show if not authenticated */}
            {!isAuthenticated ? (
                <div className="max-w-md mx-auto px-4 py-16">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock className="h-8 w-8 text-primary" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                                Autentikasi Diperlukan
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                Masukkan master password untuk mengakses Database Manager
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="accessPass">Master Password</Label>
                                <div className="relative">
                                    <Input
                                        id="accessPass"
                                        type={showAccessPassword ? 'text' : 'password'}
                                        value={accessPassword}
                                        onChange={(e) => setAccessPassword(e.target.value)}
                                        placeholder="Masukkan master password"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleVerifyAccess()
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                        onClick={() => setShowAccessPassword(!showAccessPassword)}
                                    >
                                        {showAccessPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <Button
                                className="w-full bg-primary hover:bg-primary/90 text-white"
                                onClick={handleVerifyAccess}
                                disabled={verifying}
                            >
                                {verifying ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Memverifikasi...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="h-4 w-4 mr-2" />
                                        Akses Database Manager
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => router.push('/login')}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Kembali ke Login
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Content */}
                    <div className="max-w-4xl mx-auto px-4 py-8">

                        {/* Current Database Info */}
                        {currentDatabase && (
                            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                    <div>
                                        <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                            Database Aktif
                                        </p>
                                        <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                                            {currentDatabase}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!currentDatabase && (
                            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-amber-500 rounded-full" />
                                    <div>
                                        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                                            Tidak Ada Database Aktif
                                        </p>
                                        <p className="text-sm text-amber-600 dark:text-amber-300">
                                            Klik pada nama database untuk memilih dan masuk ke sistem
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Database List */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg overflow-hidden">
                            <div className="bg-slate-100 dark:bg-slate-700 px-6 py-4 border-b border-slate-200 dark:border-slate-600">
                                <div className="grid grid-cols-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                                    <span>Database</span>
                                    <span className="text-right">Actions</span>
                                </div>
                            </div>

                            {loading ? (
                                <div className="py-12 text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                    <p className="mt-2 text-slate-500 dark:text-slate-400">Loading databases...</p>
                                </div>
                            ) : databases.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Database className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-500" />
                                    <p className="mt-2 text-slate-500 dark:text-slate-400">No databases found</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {databases.map((db) => (
                                        <div
                                            key={db.name}
                                            className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                        >
                                            <button
                                                onClick={() => handleSelectDatabase(db.name)}
                                                disabled={selectingDb !== null}
                                                className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-left cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                                            >
                                                {selectingDb === db.name && (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                )}
                                                {db.name}
                                            </button>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                    onClick={() => {
                                                        setSelectedDb(db.name)
                                                        setBackupDialogOpen(true)
                                                    }}
                                                >
                                                    <Download className="h-4 w-4 mr-1" />
                                                    Backup
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setSelectedDb(db.name)
                                                        setNewDbName('')
                                                        setDuplicateDialogOpen(true)
                                                    }}
                                                >
                                                    <Copy className="h-4 w-4 mr-1" />
                                                    Duplicate
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                        setSelectedDb(db.name)
                                                        setDeleteDialogOpen(true)
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Delete
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Bottom Actions */}
                        <div className="mt-6 flex flex-wrap justify-center gap-4">
                            <Button
                                size="lg"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => setCreateDialogOpen(true)}
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Create Database
                            </Button>
                            <Button
                                size="lg"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => setRestoreDialogOpen(true)}
                            >
                                <Upload className="h-5 w-5 mr-2" />
                                Restore Database
                            </Button>
                            <Button
                                size="lg"
                                className='bg-blue-600 hover:bg-blue-700 text-white'
                                onClick={() => setPasswordDialogOpen(true)}
                            >
                                <Key className="h-5 w-5 mr-2" />
                                Set Master Password
                            </Button>
                        </div>
                    </div>

                    {/* Create Database Dialog */}
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Plus className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                    Create Database
                                </DialogTitle>
                                <DialogDescription>
                                    Create a new database with an administrator account
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="masterPass">Master Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="masterPass"
                                            type={showPassword ? 'text' : 'password'}
                                            value={masterPassword}
                                            onChange={(e) => setMasterPassword(e.target.value)}
                                            placeholder="Enter master password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="dbName">Database Name</Label>
                                    <Input
                                        id="dbName"
                                        value={newDbName}
                                        onChange={(e) => setNewDbName(e.target.value)}
                                        placeholder="e.g., my-database"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Admin Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        placeholder="admin@example.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="adminPass">Admin Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="adminPass"
                                            type={showAdminPassword ? 'text' : 'password'}
                                            value={adminPassword}
                                            onChange={(e) => setAdminPassword(e.target.value)}
                                            placeholder="Admin account password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                                        >
                                            {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetCreateForm() }} disabled={processing}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreate} disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                                    Create
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Backup Database Dialog */}
                    <Dialog open={backupDialogOpen} onOpenChange={setBackupDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Download className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                    Backup Database
                                </DialogTitle>
                                <DialogDescription>
                                    Enter master password to backup "{selectedDb}"
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="backupPass">Master Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="backupPass"
                                            type={showPassword ? 'text' : 'password'}
                                            value={masterPassword}
                                            onChange={(e) => setMasterPassword(e.target.value)}
                                            placeholder="Enter master password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setBackupDialogOpen(false); setMasterPassword('') }} disabled={processing}>
                                    Cancel
                                </Button>
                                <Button onClick={handleBackup} disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                                    Backup
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Database Dialog */}
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-red-600">
                                    <Trash2 className="h-5 w-5" />
                                    Delete Database
                                </DialogTitle>
                                <DialogDescription>
                                    This action cannot be undone. The database will be permanently deleted.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-red-700 dark:text-red-300">
                                            You are about to delete database: <strong>{selectedDb}</strong>
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="deletePass">Master Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="deletePass"
                                            type={showPassword ? 'text' : 'password'}
                                            value={masterPassword}
                                            onChange={(e) => setMasterPassword(e.target.value)}
                                            placeholder="Enter master password to confirm"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setMasterPassword('') }} disabled={processing}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleDelete} disabled={processing}>
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                    Delete
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Duplicate Database Dialog */}
                    <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Copy className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                    Duplicate Database
                                </DialogTitle>
                                <DialogDescription>
                                    Create a copy of "{selectedDb}" with a new name
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dupPass">Master Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="dupPass"
                                            type={showPassword ? 'text' : 'password'}
                                            value={masterPassword}
                                            onChange={(e) => setMasterPassword(e.target.value)}
                                            placeholder="Enter master password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="newName">New Database Name</Label>
                                    <Input
                                        id="newName"
                                        value={newDbName}
                                        onChange={(e) => setNewDbName(e.target.value)}
                                        placeholder="e.g., my-database-copy"
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setDuplicateDialogOpen(false); setMasterPassword(''); setNewDbName('') }} disabled={processing}>
                                    Cancel
                                </Button>
                                <Button onClick={handleDuplicate} disabled={processing} variant="secondary">
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                    Duplicate
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Restore Database Dialog */}
                    <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Upload className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                    Restore Database
                                </DialogTitle>
                                <DialogDescription>
                                    Create a new database from a backup file
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="restorePass">Master Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="restorePass"
                                            type={showPassword ? 'text' : 'password'}
                                            value={masterPassword}
                                            onChange={(e) => setMasterPassword(e.target.value)}
                                            placeholder="Enter master password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="restoreName">Database Name</Label>
                                    <Input
                                        id="restoreName"
                                        value={newDbName}
                                        onChange={(e) => setNewDbName(e.target.value)}
                                        placeholder="e.g., restored-database"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Backup File (.sql)</Label>
                                    <div
                                        className="border-2 border-dashed border-slate-300 dark:border-slate-500 rounded-2xl p-4 text-center cursor-pointer hover:border-primary dark:hover:border-primary transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {selectedFile ? (
                                            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                                                <CheckCircle2 className="h-5 w-5" />
                                                <span className="font-medium">{selectedFile.name}</span>
                                            </div>
                                        ) : (
                                            <div className="text-slate-500 dark:text-slate-400">
                                                <Upload className="h-8 w-8 mx-auto mb-2" />
                                                <p className="text-sm">Click to select .sql file</p>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".sql"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) setSelectedFile(file)
                                        }}
                                    />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setRestoreDialogOpen(false); setMasterPassword(''); setNewDbName(''); setSelectedFile(null) }} disabled={processing}>
                                    Cancel
                                </Button>
                                <Button onClick={handleRestore} disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                    Restore
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Set Master Password Dialog */}
                    <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Key className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                    Set Master Password
                                </DialogTitle>
                                <DialogDescription>
                                    Change the master password for database operations
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="currentPass">Current Master Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="currentPass"
                                            type={showPassword ? 'text' : 'password'}
                                            value={masterPassword}
                                            onChange={(e) => setMasterPassword(e.target.value)}
                                            placeholder="Enter current password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="newPass">New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="newPass"
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPasswordForSet}
                                            onChange={(e) => setNewPasswordForSet(e.target.value)}
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPass">Confirm New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPass"
                                            type={showPassword ? 'text' : 'password'}
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setPasswordDialogOpen(false); setMasterPassword(''); setNewPasswordForSet(''); setConfirmNewPassword('') }} disabled={processing}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSetPassword} disabled={processing} className="bg-blue-600 hover:bg-blue-700 text-white">
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                                    Update Password
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    )
}