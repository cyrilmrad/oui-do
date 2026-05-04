import { supabase } from '@/lib/supabaseClient';

/**
 * Upload a file to the shared `assets` bucket under `{slug}/{subfolder}/…` and return its public URL.
 */
export async function uploadInvitationAsset(slug: string, file: File, subfolder: string = 'blog'): Promise<string> {
    if (!slug) {
        throw new Error('Missing invitation slug for upload');
    }
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filepath = `${slug}/${subfolder}/${filename}`;
    const { error } = await supabase.storage.from('assets').upload(filepath, file, {
        cacheControl: '3600',
        upsert: false
    });
    if (error) throw error;
    const {
        data: { publicUrl }
    } = supabase.storage.from('assets').getPublicUrl(filepath);
    return publicUrl;
}
