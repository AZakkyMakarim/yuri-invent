import { NextResponse } from 'next/server';
import { uploadFile } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type (PDF only)
        const allowedTypes = [
            'application/pdf',
        ];

        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only PDF files are allowed.' },
                { status: 400 }
            );
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File size exceeds 5MB limit' },
                { status: 400 }
            );
        }

        // Upload to Supabase Storage
        const publicUrl = await uploadFile(file);

        return NextResponse.json({
            success: true,
            path: publicUrl,
            filename: file.name
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to upload file' },
            { status: 500 }
        );
    }
}
