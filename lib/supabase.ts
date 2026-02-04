import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name (default: 'spk-documents')
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(
    file: File,
    bucket: string = 'spk-documents'
): Promise<string> {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}-${file.name}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

    return publicUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param url - The public URL of the file to delete
 * @param bucket -The storage bucket name (default: 'spk-documents')
 */
export async function deleteFile(
    url: string,
    bucket: string = 'spk-documents'
): Promise<void> {
    // Extract filename from URL
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1];

    const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName]);

    if (error) {
        console.error('Supabase delete error:', error);
        throw new Error(`Failed to delete file: ${error.message}`);
    }
}
