'use client'

import { Database, Download, Upload, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/contexts/language-context'
import { toast } from 'sonner'
import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

export function DatabaseManagement() {
    const { t } = useLanguage()
    const [backingUp, setBackingUp] = useState(false)
    const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
    const [restoring, setRestoring] = useState(false)
    const [masterPassword, setMasterPassword] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [logoutCountdown, setLogoutCountdown] = useState<number | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Countdown effect for logout
    useEffect(() => {
        if (logoutCountdown === null) return

        if (logoutCountdown <= 0) {
            signOut({ callbackUrl: '/login' })
            return
        }

        const timer = setTimeout(() => {
            setLogoutCountdown(logoutCountdown - 1)
        }, 1000)

        return () => clearTimeout(timer)
    }, [logoutCountdown])

    const handleBackup = async () => {
        setBackingUp(true)
        try {
            const response = await fetch('/api/database/backup')

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Backup failed')
            }

            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition')
            const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
            const filename = filenameMatch ? filenameMatch[1] : 'backup.sql'

            // Download the file
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast.success(t('database.backupSuccess') || 'Backup database berhasil diunduh')
        } catch (error: any) {
            console.error('Backup error:', error)
            toast.error(error.message || 'Gagal membuat backup database')
        } finally {
            setBackingUp(false)
        }
    }

    const handleRestore = async () => {
        if (!selectedFile || !masterPassword) {
            toast.error('Pilih file dan masukkan master password')
            return
        }

        setRestoring(true)
        try {
            const formData = new FormData()
            formData.append('file', selectedFile)
            formData.append('masterPassword', masterPassword)

            const response = await fetch('/api/database/restore', {
                method: 'POST',
                body: formData
            })

            const result = await response.json()

            if (!result.success) {
                if (result.error === 'Wrong master password') {
                    throw new Error(t('database.wrongPassword') || 'Master password salah')
                }
                throw new Error(result.error || 'Restore failed')
            }

            toast.success(t('database.restoreSuccess') || 'Database berhasil dipulihkan')
            setRestoreDialogOpen(false)
            setMasterPassword('')
            setSelectedFile(null)

            // Start logout countdown
            setLogoutCountdown(10)

        } catch (error: any) {
            console.error('Restore error:', error)
            toast.error(error.message || t('database.restoreError') || 'Gagal memulihkan database')
        } finally {
            setRestoring(false)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.name.endsWith('.sql')) {
                toast.error('File harus berformat .sql')
                return
            }
            setSelectedFile(file)
        }
    }

    return (
        <>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Database className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {t('database.title') || 'Manajemen Database'}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t('database.description') || 'Backup dan restore database sistem'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {/* Backup Button */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-3">
                            <Download className="h-5 w-5 text-green-600 dark:text-green-400" />
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-white">
                                    {t('database.backup') || 'Backup Database'}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('database.backupDesc') || 'Unduh salinan database dalam format .sql'}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={handleBackup}
                            disabled={backingUp}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                            {backingUp ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <Download className="mr-2 h-4 w-4" />
                                    {t('database.backup') || 'Backup Database'}
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Restore Button */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-3">
                            <Upload className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            <div>
                                <h4 className="font-medium text-slate-900 dark:text-white">
                                    {t('database.restore') || 'Restore Database'}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {t('database.restoreDesc') || 'Pulihkan database dari file backup'}
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => setRestoreDialogOpen(true)}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {t('database.restore') || 'Restore Database'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Restore Dialog */}
            <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-orange-600" />
                            {t('database.restore') || 'Restore Database'}
                        </DialogTitle>
                        <DialogDescription>
                            {t('database.restoreDesc') || 'Pulihkan database dari file backup'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Warning */}
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    {t('database.restoreWarning') || 'PERINGATAN: Proses ini akan menghapus semua data yang ada dan menggantinya dengan data dari file backup!'}
                                </p>
                            </div>
                        </div>

                        {/* File Upload */}
                        <div className="space-y-2">
                            <Label>{t('database.selectFile') || 'Pilih File .sql'}</Label>
                            <div
                                className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
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
                                        <p className="text-sm">Klik untuk memilih file .sql</p>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".sql"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>

                        {/* Master Password */}
                        <div className="space-y-2">
                            <Label htmlFor="masterPassword">
                                {t('database.masterPassword') || 'Master Password'}
                            </Label>
                            <Input
                                id="masterPassword"
                                type="password"
                                value={masterPassword}
                                onChange={(e) => setMasterPassword(e.target.value)}
                                placeholder={t('database.masterPasswordPlaceholder') || 'Masukkan master password'}
                                className="dark:text-white"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRestoreDialogOpen(false)
                                setMasterPassword('')
                                setSelectedFile(null)
                            }}
                            disabled={restoring}
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleRestore}
                            disabled={restoring || !selectedFile || !masterPassword}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                        >
                            {restoring ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Memproses...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {t('database.restoreConfirm') || 'Restore Database'}
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Logout Countdown Dialog */}
            <Dialog open={logoutCountdown !== null} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-center gap-2 text-green-600">
                            <CheckCircle2 className="h-6 w-6" />
                            {t('database.restoreSuccess') || 'Database Berhasil Dipulihkan'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-6 text-center">
                        <div className="text-5xl font-bold text-primary mb-4">
                            {logoutCountdown}
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">
                            {(t('database.logoutCountdown') || 'Akan logout dalam {seconds} detik...').replace('{seconds}', String(logoutCountdown))}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                            {t('database.logoutMessage') || 'Sistem akan logout untuk memperbarui data'}
                        </p>
                        {/* Progress bar */}
                        <div className="mt-4 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-1000 ease-linear"
                                style={{ width: `${((logoutCountdown || 0) / 10) * 100}%` }}
                            />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
