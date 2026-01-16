
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const grnNumber = formData.get('grnNumber') as string;

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ success: false, error: 'Invalid file type. Only PDF, JPG, and PNG are allowed' }, { status: 400 });
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: 'File size exceeds 5MB limit' }, { status: 400 });
        }

        // Get Authorization header to use authenticated client
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Create authenticated Supabase client
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // Generate unique filename
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = `${grnNumber}-${timestamp}.${fileExt}`;
        const filePath = `${fileName}`; // bucket/filename

        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const fileBuffer = new Uint8Array(arrayBuffer);

        // Upload to 'inbound-documents' bucket
        const { data, error } = await supabase
            .storage
            .from('inbound-documents')
            .upload(filePath, fileBuffer, {
                contentType: file.type,
                upsert: false
            });

        if (error) {
            console.error('Supabase storage error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Get public URL (assuming bucket is public, otherwise use signed URL or just path)
        // For now returning path as used in other modules
        return NextResponse.json({
            success: true,
            path: data.path,
            filename: fileName
        });

    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
