'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Lock } from 'lucide-react'

// UI Only - No backend logic yet
export default function CreateUserPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/users">
                    <Button variant="outline" size="icon" className="rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Tambah User Baru</h1>
                    <p className="text-muted-foreground">Buat akun untuk Admin, Petugas, atau Peminjam</p>
                </div>
            </div>

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Data Pengguna</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Role Akses</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer hover:bg-muted has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                                <input type="radio" name="role" value="ADMIN" className="accent-primary" />
                                <span className="text-sm font-medium">Admin</span>
                            </label>
                            <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer hover:bg-muted has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                                <input type="radio" name="role" value="PETUGAS" className="accent-primary" />
                                <span className="text-sm font-medium">Petugas</span>
                            </label>
                            <label className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer hover:bg-muted has-[:checked]:bg-primary/5 has-[:checked]:border-primary">
                                <input type="radio" name="role" value="PEMINJAM" defaultChecked className="accent-primary" />
                                <span className="text-sm font-medium">Peminjam</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nama Lengkap</label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-9" placeholder="Masukkan nama" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-9" type="email" placeholder="nama@email.com" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">No. Telepon</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-9" placeholder="08xxxxxxxxxx" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Password Default</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-9" type="password" value="123456" disabled />
                            </div>
                            <p className="text-[10px] text-muted-foreground">Default: 123456</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Alamat Lengkap</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <textarea
                                className="w-full min-h-[80px] rounded-lg border bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="Jl. Raya..."
                            />
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t p-6">
                    <Button variant="outline">Batal</Button>
                    <Button>
                        <Save className="mr-2 h-4 w-4" />
                        Simpan User
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
