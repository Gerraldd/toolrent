import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

// POST /api/upload - Upload file
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const folder = formData.get('folder') as string || 'alat'

        // Check authorization based on folder
        // - 'profiles' folder: allow all authenticated users
        // - Other folders: only admin and petugas
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        if (folder !== 'profiles' && !['admin', 'petugas'].includes(session.user.role)) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'File tidak ditemukan' },
                { status: 400 }
            )
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'Tipe file tidak didukung. Gunakan JPEG, PNG, WebP, atau GIF.' },
                { status: 400 }
            )
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, error: 'Ukuran file maksimal 5MB' },
                { status: 400 }
            )
        }

        // Create upload directory if it doesn't exist
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', folder)
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true })
        }

        // Generate unique filename
        const timestamp = Date.now()
        const randomStr = Math.random().toString(36).substring(2, 8)
        const ext = file.name.split('.').pop() || 'jpg'
        const filename = `${timestamp}-${randomStr}.${ext}`
        const filepath = path.join(uploadDir, filename)

        // Write file to disk
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filepath, buffer)

        // Return the public URL
        const publicUrl = `/uploads/${folder}/${filename}`

        return NextResponse.json({
            success: true,
            message: 'File berhasil diupload',
            data: {
                url: publicUrl,
                filename: filename,
                originalName: file.name,
                size: file.size,
                type: file.type
            }
        })
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json(
            { success: false, error: 'Gagal mengupload file' },
            { status: 500 }
        )
    }
}
