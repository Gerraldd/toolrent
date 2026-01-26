'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, Upload } from 'lucide-react'

// UI Only - No backend logic yet
export default function CreateAlatPage() {
    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/alat">
                    <Button variant="outline" size="icon" className="rounded-full">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Tambah Alat Baru</h1>
                    <p className="text-muted-foreground">Isi formulir untuk menambahkan alat ke inventaris</p>
                </div>
            </div>

            {/* Form Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Alat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Foto Upload Placeholder */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Foto Alat</label>
                        <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                            <Upload className="h-8 w-8 mb-2" />
                            <span className="text-sm">Klik untuk upload foto</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nama Alat</label>
                            <Input placeholder="Contoh: Multimeter Digital" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Kode Alat</label>
                            <Input placeholder="Contoh: ELK-001" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Kategori</label>
                            <select className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                <option value="">Pilih Kategori</option>
                                <option value="1">Elektronika</option>
                                <option value="2">Komputer</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Kondisi</label>
                            <select className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                                <option value="BAIK">Baik</option>
                                <option value="RUSAK_RINGAN">Rusak Ringan</option>
                                <option value="RUSAK_BERAT">Rusak Berat</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Deskripsi</label>
                        <textarea
                            className="w-full min-h-[100px] rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Deskripsi detail alat..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Stok Awal</label>
                        <Input type="number" min="1" defaultValue="1" className="w-1/3" />
                    </div>

                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t p-6">
                    <Button variant="outline">Batal</Button>
                    <Button>
                        <Save className="mr-2 h-4 w-4" />
                        Simpan Data
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
