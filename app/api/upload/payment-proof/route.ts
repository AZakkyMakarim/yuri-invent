import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only PDF, JPG, and PNG are allowed' },
                { status: 400 }
            );
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File size exceeds 10MB limit' },
                { status: 400 }
            );
        }

        // Create authenticated Supabase client using the user's token
        const authHeader = request.headers.get('Authorization');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: authHeader || '',
                    },
                },
            }
        );

        // Generate unique filename
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `payment-proof-${timestamp}.${fileExt}`;

        // Upload to Supabase Storage - Reusing 'po-documents' bucket for now if separate one doesn't exist
        // Ideally should be 'payment-proofs'
        const { data, error } = await supabase.storage
            .from('po-documents')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Supabase upload error:', error);
            throw new Error(error.message);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('po-documents')
            .getPublicUrl(fileName);

        return NextResponse.json({
            success: true,
            path: publicUrl,
            filename: file.name
        });
    } catch (error: any) {
        console.error('File upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to upload file' },
            { status: 500 }
        );
    }
}
