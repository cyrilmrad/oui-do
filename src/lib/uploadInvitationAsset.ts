import { supabase } from '@/lib/supabaseClient';

// Per-kind upload size caps. Videos are legitimately large (hero loops); images
// and audio are bounded tighter.
const MAX_BYTES: Record<'image' | 'video' | 'audio', number> = {
    image: 15 * 1024 * 1024,
    video: 150 * 1024 * 1024,
    audio: 25 * 1024 * 1024,
};

function assetKind(mime: string): 'image' | 'video' | 'audio' | null {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    return null;
}

/**
 * Upload a file to the shared `assets` bucket under `{slug}/{subfolder}/…` and return its public URL.
 *
 * Only image/video/audio files are accepted (the bucket is public and served to
 * guests), each bounded by a per-kind size cap. Filenames are prefixed with a
 * random UUID so they are unguessable and never collide.
 */
export async function uploadInvitationAsset(slug: string, file: File, subfolder: string = 'blog'): Promise<string> {
    if (!slug) {
        throw new Error('Missing invitation slug for upload');
    }

    const kind = assetKind(file.type);
    if (!kind) {
        throw new Error('Unsupported file type. Please upload an image, video, or audio file.');
    }
    if (file.size > MAX_BYTES[kind]) {
        const mb = Math.round(MAX_BYTES[kind] / (1024 * 1024));
        throw new Error(`File is too large. ${kind} uploads are limited to ${mb} MB.`);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${crypto.randomUUID()}-${safeName}`;
    const filepath = `${slug}/${subfolder}/${filename}`;
    const { error } = await supabase.storage.from('assets').upload(filepath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
    });
    if (error) throw error;
    const {
        data: { publicUrl }
    } = supabase.storage.from('assets').getPublicUrl(filepath);
    return publicUrl;
}
