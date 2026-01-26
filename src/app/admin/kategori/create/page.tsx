'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, Tag } from 'lucide-react'

// UI Only - No backend logic yet
export default function CreateKategoriPage() {
    return (
        <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/kategori">
                    <Button variant="outline" size="icon" className="rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Tambah Kategori</h1>
                    <p className="text-muted-foreground">Buat kategori baru untuk alat</p>
                </div>
            </div>

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Kategori</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nama Kategori</label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-9" placeholder="Contoh: Elektronika" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Deskripsi</label>
                        <textarea
                            className="w-full min-h-[120px] rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Jelaskan kategori ini..."
                        />
                    </div>

                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t p-6">
                    <Button variant="outline">Batal</Button>
                    <Button>
                        <Save className="mr-2 h-4 w-4" />
                        Simpan Kategori
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
