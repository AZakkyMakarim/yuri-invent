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

        // Get bucket from form data
        const bucket = formData.get('bucket') as string;

        if (!bucket) {
            return NextResponse.json(
                { error: 'Bucket name is required' },
                { status: 400 }
            );
        }

        // Upload to Supabase Storage using generic uploadFile
        // Note: Specific validation should be done by the client or specific route wrapper
        const publicUrl = await uploadFile(file, bucket);

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
