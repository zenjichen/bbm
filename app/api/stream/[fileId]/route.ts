import { NextResponse } from 'next/server';

/**
 * Redirect to the public Google Drive download URL.
 * Since the folder is publicly shared, no API key is needed.
 * This route is kept as a fallback for backward compatibility.
 */
export async function GET(
    _request: Request,
    { params }: { params: { fileId: string } }
) {
    const { fileId } = params;
    const publicUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${encodeURIComponent(fileId)}`;
    return NextResponse.redirect(publicUrl, { status: 302 });
}
