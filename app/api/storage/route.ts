import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/rateLimit';
import crypto from 'crypto';

// Whitelist of allowed extensions for media storage uploads to prevent malicious scripts
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'pdf', 'mp4', 'mov'];

async function getBucketName(supabase: any): Promise<string> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('Error listing buckets in getBucketName:', error);
      return 'app-file'; // Fallback
    }
    
    // Find a bucket named 'app-file' case-insensitively
    const match = buckets?.find(
      (b: any) => b.id?.toLowerCase() === 'app-file' || b.name?.toLowerCase() === 'app-file'
    );
    
    if (match) {
      console.log(`Matched existing storage bucket: "${match.id}"`);
      return match.id;
    }
    
    // If not found, attempt to create 'app-file'
    console.warn('Bucket "app-file" (case-insensitive) not found. Attempting to create "app-file"...');
    const { error: createError } = await supabase.storage.createBucket('app-file', {
      public: true
    });
    
    if (createError) {
      console.error('Failed to auto-create "app-file" bucket:', createError);
    } else {
      console.log('Successfully created "app-file" bucket.');
    }
    return 'app-file';
  } catch (err) {
    console.error('Exception in getBucketName helper:', err);
    return 'app-file';
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check (Max 40 storage requests per minute per IP to prevent exhaustion attacks)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimitRes = checkRateLimit(ip, 40, 60000);
    if (!rateLimitRes.success) {
      return NextResponse.json(
        { error: `Too many storage operations. Please try again in ${rateLimitRes.reset} seconds.` },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitRes.limit),
            'X-RateLimit-Remaining': String(rateLimitRes.remaining),
            'X-RateLimit-Reset': String(rateLimitRes.reset)
          }
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, userId, featureName, itemId, fileBase64, extension, mimeType, path, paths } = body;

    // 2. Base Input Validation
    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Action parameter is required and must be a string.' }, { status: 400 });
    }

    const actionLower = action.toLowerCase();
    if (!['upload', 'getsignedurl', 'getsignedurls', 'delete'].includes(actionLower)) {
      return NextResponse.json({ error: `Invalid action specified: "${action}". Only upload, getSignedUrl, getSignedUrls, and delete are allowed.` }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase admin client could not be initialized' },
        { status: 500 }
      );
    }

    const bucketName = await getBucketName(supabase);

    if (actionLower === 'upload') {
      if (!userId || !featureName || !itemId || !fileBase64 || !extension) {
        return NextResponse.json({ error: 'Missing required upload parameters' }, { status: 400 });
      }

      // Path Sanitization & Directory Traversal Protection
      const safeUserId = String(userId).replace(/[^a-zA-Z0-9_\-]/g, '');
      const safeFeatureName = String(featureName).replace(/[^a-zA-Z0-9_\-]/g, '');
      const safeItemId = String(itemId).replace(/[^a-zA-Z0-9_\-]/g, '');
      const safeExtension = String(extension).replace(/^\./, '').replace(/[^a-zA-Z0-9]/g, '');

      if (!ALLOWED_EXTENSIONS.includes(safeExtension.toLowerCase())) {
        return NextResponse.json({ error: `File type extension ".${safeExtension}" is not permitted for upload.` }, { status: 400 });
      }

      // Convert base64 data URL to buffer safely
      let base64Clean = fileBase64;
      let detectedMimeType = mimeType || 'image/png';

      if (typeof fileBase64 === 'string' && fileBase64.startsWith('data:')) {
        const parts = fileBase64.split(';base64,');
        if (parts.length === 2) {
          const match = fileBase64.match(/data:([^;]+);/);
          if (match) {
            detectedMimeType = match[1];
          }
          base64Clean = parts[1];
        }
      }

      // Safety check: ensure clean base64 string
      if (typeof base64Clean !== 'string' || base64Clean.length === 0) {
        return NextResponse.json({ error: 'Invalid base64 payload provided.' }, { status: 400 });
      }

      const buffer = Buffer.from(base64Clean, 'base64');
      const fileUuid = crypto.randomUUID();
      const filePath = `${safeUserId}/${safeFeatureName}/${safeItemId}/${fileUuid}.${safeExtension}`;

      let uploadResult = await supabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: detectedMimeType,
          upsert: true
        });

      if (uploadResult.error && (
        uploadResult.error.message?.toLowerCase().includes('bucket not found') ||
        (uploadResult.error as any).status === 404 ||
        (uploadResult.error as any).statusCode === '404' ||
        (uploadResult.error as any).statusCode === 404
      )) {
        console.warn(`Bucket "${bucketName}" not found. Attempting to create it...`);
        try {
          const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true
          });
          if (createError) {
            console.error(`Failed to auto-create "${bucketName}" bucket:`, createError);
          } else {
            console.log(`Successfully created "${bucketName}" bucket. Retrying upload...`);
            uploadResult = await supabase.storage
              .from(bucketName)
              .upload(filePath, buffer, {
                contentType: detectedMimeType,
                upsert: true
              });
          }
        } catch (bucketCreateErr) {
          console.error('Exception during bucket auto-creation:', bucketCreateErr);
        }
      }

      if (uploadResult.error) {
        console.error('Storage upload error:', uploadResult.error);
        return NextResponse.json({ error: uploadResult.error.message }, { status: 400 });
      }

      return NextResponse.json({ path: filePath });

    } else if (actionLower === 'getsignedurl') {
      if (!path || typeof path !== 'string') {
        return NextResponse.json({ error: 'Missing required parameter: path string' }, { status: 400 });
      }

      // Prevent Directory Traversal
      if (path.includes('..') || path.startsWith('/')) {
        return NextResponse.json({ error: 'Malicious path traversal block activated.' }, { status: 400 });
      }

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(path, 60 * 60 * 24); // 24 hours expiry

      if (error) {
        console.error('Storage sign url error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ signedUrl: data.signedUrl });

    } else if (actionLower === 'getsignedurls') {
      if (!paths || !Array.isArray(paths)) {
        return NextResponse.json({ error: 'Missing required parameter: paths array' }, { status: 400 });
      }

      // Check all path variables for traversal signatures
      for (const p of paths) {
        if (typeof p !== 'string' || p.includes('..') || p.startsWith('/')) {
          return NextResponse.json({ error: 'Malicious path traversal block activated on file subset.' }, { status: 400 });
        }
      }

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrls(paths, 60 * 60 * 24); // 24 hours expiry

      if (error) {
        console.error('Storage sign urls error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ signedUrls: data });

    } else if (actionLower === 'delete') {
      if (!path || typeof path !== 'string') {
        return NextResponse.json({ error: 'Missing required parameter: path string' }, { status: 400 });
      }

      // Block Directory Traversal
      if (path.includes('..') || path.startsWith('/')) {
        return NextResponse.json({ error: 'Malicious path traversal block activated.' }, { status: 400 });
      }

      const { data, error } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (error) {
        console.error('Storage delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    console.error('Storage API route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error occurred on storage desk.' }, { status: 500 });
  }
}
