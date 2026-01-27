
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        // Validate file type (PDF only for SPK)
        const allowedTypes = ['application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ success: false, error: 'Invalid file type. Only PDF files are allowed for SPK documents.' }, { status: 400 });
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: 'File size exceeds 5MB limit' }, { status: 400 });
        }

        // Get Authorization header to use authenticated client
        const authHeader = req.headers.get('Authorization');

        // Create Supabase client
        const options = authHeader ? { global: { headers: { Authorization: authHeader } } } : {};
        const supabase = createClient(supabaseUrl, supabaseAnonKey, options);

        // Generate unique filename
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `spk-${timestamp}.${fileExt}`;
        const filePath = `${fileName}`;

        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = new Uint8Array(arrayBuffer);

        // Upload to 'spk-documents' bucket
        const { data, error } = await supabase
            .storage
            .from('spk-documents')
            .upload(filePath, fileBuffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            console.error('Supabase storage error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Get public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('spk-documents')
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            path: publicUrl,
            filename: fileName
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
