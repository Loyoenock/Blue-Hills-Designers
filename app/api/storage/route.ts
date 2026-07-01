import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, featureName, itemId, fileBase64, extension, mimeType, path, paths } = body;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase admin client could not be initialized' },
        { status: 500 }
      );
    }

    if (action === 'upload') {
      if (!userId || !featureName || !itemId || !fileBase64 || !extension) {
        return NextResponse.json({ error: 'Missing required upload parameters' }, { status: 400 });
      }

      // Convert base64 data URL to buffer
      // The fileBase64 can be a raw base64 string or a data URL (e.g. "data:image/png;base64,iVBOR...")
      let base64Clean = fileBase64;
      let detectedMimeType = mimeType || 'image/png';

      if (fileBase64.startsWith('data:')) {
        const parts = fileBase64.split(';base64,');
        if (parts.length === 2) {
          const match = fileBase64.match(/data:([^;]+);/);
          if (match) {
            detectedMimeType = match[1];
          }
          base64Clean = parts[1];
        }
      }

      const buffer = Buffer.from(base64Clean, 'base64');
      const fileUuid = crypto.randomUUID();
      const filePath = `${userId}/${featureName}/${itemId}/${fileUuid}.${extension.replace(/^\./, '')}`;

      const { data, error } = await supabase.storage
        .from('app-file')
        .upload(filePath, buffer, {
          contentType: detectedMimeType,
          upsert: true
        });

      if (error) {
        console.error('Storage upload error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ path: filePath });
    } else if (action === 'getSignedUrl') {
      if (!path) {
        return NextResponse.json({ error: 'Missing required parameter: path' }, { status: 400 });
      }

      const { data, error } = await supabase.storage
        .from('app-file')
        .createSignedUrl(path, 60 * 60 * 24); // 24 hours expiry

      if (error) {
        console.error('Storage sign url error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ signedUrl: data.signedUrl });
    } else if (action === 'getSignedUrls') {
      if (!paths || !Array.isArray(paths)) {
        return NextResponse.json({ error: 'Missing required parameter: paths array' }, { status: 400 });
      }

      const { data, error } = await supabase.storage
        .from('app-file')
        .createSignedUrls(paths, 60 * 60 * 24); // 24 hours expiry

      if (error) {
        console.error('Storage sign urls error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ signedUrls: data });
    } else if (action === 'delete') {
      if (!path) {
        return NextResponse.json({ error: 'Missing required parameter: path' }, { status: 400 });
      }

      const { data, error } = await supabase.storage
        .from('app-file')
        .remove([path]);

      if (error) {
        console.error('Storage delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Storage API route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
