'use client'

import { Settings, Globe, Sun, Moon, Monitor, User, Lock, Loader2, Camera, Upload, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useLanguage } from '@/contexts/language-context'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export function SettingsContent() {
    const { language, setLanguage, t } = useLanguage()
    const { theme, setTheme, resolvedTheme } = useTheme()
    const { data: session, update: updateSession } = useSession()
    const [mounted, setMounted] = useState(false)

    // User info form state
    const [userForm, setUserForm] = useState({
        nama: '',
        email: '',
        noTelepon: '',
        alamat: '',
        image: ''
    })
    const [savingUser, setSavingUser] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)

    // Password form state
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [savingPassword, setSavingPassword] = useState(false)

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    // Load user data when session is available
    useEffect(() => {
        if (session?.user) {
            setUserForm({
                nama: session.user.nama || '',
                email: session.user.email || '',
                noTelepon: (session.user as any).noTelepon || '',
                alamat: (session.user as any).alamat || '',
                image: (session.user as any).image || ''
            })
        }
    }, [session])

    const handleLanguageChange = (lang: 'id' | 'en') => {
        setLanguage(lang)
        toast.success(t('settings.saved'))
    }

    const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
        setTheme(newTheme)
        toast.success(t('settings.themeChanged'))
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
                setUserForm(prev => ({ ...prev, image: result.data.url }))
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

    const handleUserInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSavingUser(true)
        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userForm)
            })
            const result = await response.json()
            if (result.success) {
                toast.success(t('settings.profileUpdated'))
                await updateSession()
            } else {
                toast.error(result.error || t('common.error'))
            }
        } catch (error) {
            toast.error(t('common.error'))
        } finally {
            setSavingUser(false)
        }
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error(t('settings.passwordMismatch'))
            return
        }
        if (passwordForm.newPassword.length < 6) {
            toast.error(t('settings.passwordTooShort'))
            return
        }
        setSavingPassword(true)
        try {
            const response = await fetch('/api/user/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                })
            })
            const result = await response.json()
            if (result.success) {
                toast.success(t('settings.passwordChanged'))
                setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
            } else {
                toast.error(result.error || t('common.error'))
            }
        } catch (error) {
            toast.error(t('common.error'))
        } finally {
            setSavingPassword(false)
        }
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-md shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
            {/* Header Section */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Settings className="h-6 w-6 text-primary dark:text-blue-200" />
                    {t('settings.title')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    {t('settings.description')}
                </p>
            </div>

            {/* Settings Content */}
            <div className="p-6 space-y-6">
                {/* Theme Section */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            {mounted && resolvedTheme === 'dark' ? (
                                <Moon className="h-5 w-5 text-amber-600 dark:text-amber-200" />
                            ) : (
                                <Sun className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {t('settings.theme')}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t('settings.themeDescription')}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                        {/* Light Mode Option */}
                        <button
                            onClick={() => handleThemeChange('light')}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${mounted && theme === 'light'
                                ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700'
                                }`}
                        >
                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <Sun className="h-5 w-5 text-amber-500" />
                            </div>
                            <div className="text-left flex-1">
                                <div className={`font-medium ${mounted && theme === 'light' ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-white'}`}>
                                    {t('settings.theme.light')}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Light</div>
                            </div>
                            {mounted && theme === 'light' && (
                                <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center">
                                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>

                        {/* Dark Mode Option */}
                        <button
                            onClick={() => handleThemeChange('dark')}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${mounted && theme === 'dark'
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50'
                                }`}
                        >
                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <Moon className="h-5 w-5 text-primary dark:text-blue-200" />
                            </div>
                            <div className="text-left flex-1">
                                <div className={`font-medium ${mounted && theme === 'dark' ? 'text-primary dark:text-blue-200' : 'text-slate-900 dark:text-white'}`}>
                                    {t('settings.theme.dark')}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Dark</div>
                            </div>
                            {mounted && theme === 'dark' && (
                                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>

                        {/* System Mode Option */}
                        <button
                            onClick={() => handleThemeChange('system')}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${mounted && theme === 'system'
                                ? 'border-slate-500 bg-slate-100 dark:bg-slate-800'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                                }`}
                        >
                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                <Monitor className="h-5 w-5 text-slate-500" />
                            </div>
                            <div className="text-left flex-1">
                                <div className={`font-medium ${mounted && theme === 'system' ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>
                                    {t('settings.theme.system')}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Auto</div>
                            </div>
                            {mounted && theme === 'system' && (
                                <div className="h-6 w-6 rounded-full bg-slate-500 flex items-center justify-center">
                                    <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                {/* Language Section */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Globe className="h-5 w-5 text-primary dark:text-blue-200" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {t('settings.language')}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t('settings.languageDescription')}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {/* Indonesian Option */}
                        <button
                            onClick={() => handleLanguageChange('id')}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${language === 'id'
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50'
                                }`}
                        >
                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xl dark:text-white">
                                🇮🇩
                            </div>
                            <div className="text-left">
                                <div className={`font-medium ${language === 'id' ? 'text-primary dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                                    {t('settings.indonesian')}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">Indonesia</div>
                            </div>
                            {language === 'id' && (
                                <div className="ml-auto">
                                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </button>

                        {/* English Option */}
                        <button
                            onClick={() => handleLanguageChange('en')}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${language === 'en'
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50'
                                }`}
                        >
                            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xl dark:text-white">
                                🇬🇧
                            </div>
                            <div className="text-left">
                                <div className={`font-medium ${language === 'en' ? 'text-primary dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                                    {t('settings.english')}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase">English</div>
                            </div>
                            {language === 'en' && (
                                <div className="ml-auto">
                                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                {/* User Information Section */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <User className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {t('settings.userInfo')}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t('settings.userInfoDescription')}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleUserInfoSubmit} className="space-y-6 mt-4">
                        {/* Profile Picture Upload */}
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="relative group">
                                <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-800 shadow-lg">
                                    <AvatarImage src={userForm.image || undefined} className="object-cover" />
                                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                                        {userForm.nama?.substring(0, 2).toUpperCase() || 'US'}
                                    </AvatarFallback>
                                </Avatar>
                                <label
                                    htmlFor="image-upload"
                                    className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full shadow-lg cursor-pointer hover:bg-primary/90 transition-all border-2 border-white dark:border-slate-800"
                                >
                                    {uploadingImage ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Camera className="h-4 w-4" />
                                    )}
                                    <input
                                        type="file"
                                        id="image-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploadingImage}
                                    />
                                </label>
                                {userForm.image && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUserForm(prev => ({ ...prev, image: '' }))
                                            toast.success('Foto profil dihapus. Klik Simpan untuk menyimpan perubahan.')
                                        }}
                                        className="absolute bottom-0 left-0 p-1.5 bg-red-500 text-white rounded-full shadow-lg cursor-pointer hover:bg-red-600 transition-all border-2 border-white dark:border-slate-800"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="text-center sm:text-left space-y-1">
                                <h4 className="font-medium text-slate-900 dark:text-white">
                                    {t('settings.profilePicture')}
                                </h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                                    {t('settings.profilePictureDesc') || 'Upload gambar JPG, PNG atau GIF. Maksimal 2MB.'}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="nama" className="text-slate-700 dark:text-slate-300">{t('users.name')}</Label>
                                <Input
                                    id="nama"
                                    value={userForm.nama}
                                    onChange={(e) => setUserForm(prev => ({ ...prev, nama: e.target.value }))}
                                    placeholder={t('users.namePlaceholder')}
                                    className="dark:text-white dark:placeholder:text-slate-400"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">{t('users.email')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={userForm.email}
                                    onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder={t('users.emailPlaceholder')}
                                    className="dark:text-white dark:placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="noTelepon" className="text-slate-700 dark:text-slate-300">{t('users.phone')}</Label>
                                <Input
                                    id="noTelepon"
                                    value={userForm.noTelepon}
                                    onChange={(e) => setUserForm(prev => ({ ...prev, noTelepon: e.target.value }))}
                                    placeholder={t('users.phonePlaceholder')}
                                    className="dark:text-white dark:placeholder:text-slate-400"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="alamat" className="text-slate-700 dark:text-slate-300">{t('users.address')}</Label>
                                <Input
                                    id="alamat"
                                    value={userForm.alamat}
                                    onChange={(e) => setUserForm(prev => ({ ...prev, alamat: e.target.value }))}
                                    placeholder={t('users.addressPlaceholder')}
                                    className="dark:text-white dark:placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={savingUser} className="bg-primary hover:bg-primary/90 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white dark:border-slate-600">
                                {savingUser && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('common.save')}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Password Security Section */}
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <Lock className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                {t('settings.security')}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {t('settings.securityDescription')}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="space-y-4 mt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="newPassword" className="text-slate-700 dark:text-slate-300">{t('settings.newPassword')}</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                    placeholder="••••••••"
                                    className="dark:text-white dark:placeholder:text-slate-400"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">{t('settings.confirmPassword')}</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    placeholder="••••••••"
                                    className="dark:text-white dark:placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" variant="destructive" disabled={savingPassword}>
                                {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('settings.changePassword')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
