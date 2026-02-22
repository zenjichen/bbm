/**
 * Google Drive API helper — client-side compatible (static export / GitHub Pages).
 * Uses NEXT_PUBLIC_ env vars so they are embedded into the browser bundle.
 * The API key is visible in JS, but since the Drive folder is already public
 * this is acceptable for a personal app.
 */

const DRIVE_API = 'https://www.googleapis.com/drive/v3';

function getRootFolderId(): string {
    return process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID || '';
}

function getApiKey(): string {
    return process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
}

export interface Playlist {
    id: string;
    name: string;
    trackCount?: number;
}

export interface DriveTrack {
    id: string;
    file_id: string;
    name: string;
    title: string | null;
    performer: string | null;
    duration: number;
    file_size: number;
    mime_type: string;
    playlist_id: string;
    topic_id: null;
    date: number;
    thumbnail: null;
    stream_url: string;
}

interface DriveFileRaw {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    modifiedTime?: string;
}

/** Build Drive API URL with key */
function driveUrl(endpoint: string, params: Record<string, string> = {}): string {
    const url = new URL(`${DRIVE_API}${endpoint}`);
    url.searchParams.set('key', getApiKey());
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }
    return url.toString();
}

/** List all playlist folders inside the root folder */
export async function getPlaylists(): Promise<Playlist[]> {
    const folderId = getRootFolderId();
    const apiKey = getApiKey();

    // Debug: log env var status (safe since Drive folder is public anyway)
    console.log('[Drive] Folder ID:', folderId ? `${folderId.substring(0, 8)}...` : 'EMPTY');
    console.log('[Drive] API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'EMPTY');

    if (!folderId || !apiKey) {
        throw new Error('Missing NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID or NEXT_PUBLIC_GOOGLE_API_KEY');
    }

    const query = `'${folderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const url = driveUrl('/files', {
        q: query,
        fields: 'files(id,name)',
        orderBy: 'name',
        pageSize: '100',
    });

    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Drive API ${res.status}: ${err}`);
    }

    const data = await res.json();
    return (data.files || []).map((f: DriveFileRaw) => ({ id: f.id, name: f.name }));
}

/** List all audio tracks inside a playlist folder */
export async function getTracksInPlaylist(playlistId: string): Promise<DriveTrack[]> {
    const query = `'${playlistId}' in parents and trashed = false`;
    const url = driveUrl('/files', {
        q: query,
        fields: 'files(id,name,mimeType,size,modifiedTime)',
        orderBy: 'name',
        pageSize: '1000',
    });

    const res = await fetch(url);
    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Drive API ${res.status}: ${err}`);
    }

    const data = await res.json();
    const audioFiles = (data.files || []).filter((f: DriveFileRaw) =>
        f.mimeType?.includes('audio') ||
        /\.(mp3|m4a|wav|flac|ogg|aac|opus|wma)$/i.test(f.name)
    );

    return audioFiles.map((f: DriveFileRaw) => parseDriveFile(f, playlistId));
}

/** Fetch all playlists and all their tracks in parallel */
export async function getAllTracks(): Promise<{ playlists: Playlist[]; tracks: DriveTrack[] }> {
    const playlists = await getPlaylists();
    const trackArrays = await Promise.all(
        playlists.map(pl => getTracksInPlaylist(pl.id).catch(() => [] as DriveTrack[]))
    );
    const tracks = trackArrays.flat();
    const playlistsWithCount = playlists.map((pl, i) => ({
        ...pl,
        trackCount: trackArrays[i].length,
    }));
    return { playlists: playlistsWithCount, tracks };
}

function parseDriveFile(f: DriveFileRaw, playlistId: string): DriveTrack {
    const nameNoExt = f.name.replace(/\.[^/.]+$/, '');
    const { title, performer } = parseTitlePerformer(nameNoExt);
    const modifiedMs = f.modifiedTime ? new Date(f.modifiedTime).getTime() : Date.now();

    return {
        id: f.id,
        file_id: f.id,
        name: f.name,
        title,
        performer,
        duration: 0,
        file_size: parseInt(f.size || '0', 10),
        mime_type: f.mimeType || 'audio/mpeg',
        playlist_id: playlistId,
        topic_id: null,
        date: Math.floor(modifiedMs / 1000),
        thumbnail: null,
        // Use googleapis.com media endpoint — supports CORS (Access-Control-Allow-Origin: *)
        // drive.google.com/uc redirect URLs are blocked by browser audio CORS policy
        stream_url: `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${getApiKey()}`,
    };
}

/**
 * Parse "Artist - Title" or "Title" from filename.
 *   "Sơn Tùng - Nơi này có anh.mp3" → performer: "Sơn Tùng", title: "Nơi này có anh"
 *   "Đen Vâu remix.mp3"             → performer: null,       title: "Đen Vâu remix"
 */
function parseTitlePerformer(name: string): { title: string; performer: string | null } {
    const dashMatch = name.match(/^(.+?)\s+-\s+(.+)$/);
    if (dashMatch) {
        return { performer: dashMatch[1].trim(), title: dashMatch[2].trim() };
    }
    return { title: name.trim(), performer: null };
}
