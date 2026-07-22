import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { enforceRateLimit, createErrorResponse, logger, validateFields, ApiError, requireAuth } from '@/lib/apiUtils';
import crypto from 'crypto';

// Whitelist of allowed extensions for media storage uploads to prevent malicious scripts
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'pdf', 'mp4', 'mov'];

async function getBucketName(supabase: any): Promise<string> {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      logger.error('Error listing buckets in getBucketName helper', error);
      return 'app-file'; // Fallback
    }
    
    // Find a bucket named 'app-file' case-insensitively
    const match = buckets?.find(
      (b: any) => b.id?.toLowerCase() === 'app-file' || b.name?.toLowerCase() === 'app-file'
    );
    
    if (match) {
      logger.info(`Matched existing storage bucket: "${match.id}"`);
      return match.id;
    }
    
    // If not found, attempt to create 'app-file'
    logger.warn('Bucket "app-file" (case-insensitive) not found. Attempting to create "app-file"...');
    const { error: createError } = await supabase.storage.createBucket('app-file', {
      public: true
    });
    
    if (createError) {
      logger.error('Failed to auto-create "app-file" bucket', createError);
    } else {
      logger.info('Successfully created "app-file" bucket.');
    }
    return 'app-file';
  } catch (err) {
    logger.error('Exception in getBucketName helper', err);
    return 'app-file';
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check (Max 150 storage requests per minute per IP to prevent exhaustion attacks while enabling batch uploads)
    enforceRateLimit(req, 150, 60000);

    // 2. Authentication Check
    const authUser = await requireAuth(req);
    const isAdminOrStaff = ['super admin', 'admin', 'manager', 'staff'].includes(
      (authUser.role || '').toLowerCase().trim()
    );

    const body = await req.json().catch(() => ({}));
    
    // 3. Base Input Validation
    validateFields(body, {
      action: 'string'
    });

    const { action, userId, featureName, itemId, fileBase64, extension, mimeType, path, paths } = body;
    const actionLower = action.toLowerCase();

    if (!['upload', 'getsignedurl', 'getsignedurls', 'delete'].includes(actionLower)) {
      throw new ApiError(`Invalid action specified: "${action}". Only upload, getSignedUrl, getSignedUrls, and delete are allowed.`, 400);
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      throw new ApiError('Supabase admin client could not be initialized.', 500);
    }

    const bucketName = await getBucketName(supabase);

    if (actionLower === 'upload') {
      if (!userId || !featureName || !itemId || !fileBase64 || !extension) {
        throw new ApiError('Missing required upload parameters.', 400);
      }

      // Check ownership or admin/staff privileges
      if (!isAdminOrStaff && String(userId) !== authUser.id) {
        throw new ApiError('Forbidden: You can only upload files for your own account.', 403);
      }

      // Path Sanitization & Directory Traversal Protection
      const safeUserId = String(userId).replace(/[^a-zA-Z0-9_\-]/g, '');
      const safeFeatureName = String(featureName).replace(/[^a-zA-Z0-9_\-]/g, '');
      const safeItemId = String(itemId).replace(/[^a-zA-Z0-9_\-]/g, '');
      const safeExtension = String(extension).replace(/^\./, '').replace(/[^a-zA-Z0-9]/g, '');

      if (!ALLOWED_EXTENSIONS.includes(safeExtension.toLowerCase())) {
        throw new ApiError(`File type extension ".${safeExtension}" is not permitted for upload.`, 400);
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
        throw new ApiError('Invalid base64 payload provided.', 400);
      }

      const buffer = Buffer.from(base64Clean, 'base64');
      const fileUuid = crypto.randomUUID();
      const filePath = `${safeUserId}/${safeFeatureName}/${safeItemId}/${fileUuid}.${safeExtension}`;

      logger.info('Initiating storage file upload', { filePath, mimeType: detectedMimeType });

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
        logger.warn(`Bucket "${bucketName}" not found. Attempting to create it...`);
        try {
          const { error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true
          });
          if (createError) {
            logger.error(`Failed to auto-create "${bucketName}" bucket`, createError);
          } else {
            logger.info(`Successfully created "${bucketName}" bucket. Retrying upload...`);
            uploadResult = await supabase.storage
              .from(bucketName)
              .upload(filePath, buffer, {
                contentType: detectedMimeType,
                upsert: true
              });
          }
        } catch (bucketCreateErr) {
          logger.error('Exception during bucket auto-creation', bucketCreateErr);
        }
      }

      if (uploadResult.error) {
        logger.error('Storage upload error', uploadResult.error);
        throw new ApiError(uploadResult.error.message, 400);
      }

      logger.info('File uploaded successfully to storage', { filePath });
      return NextResponse.json({ path: filePath });

    } else if (actionLower === 'getsignedurl') {
      if (!path || typeof path !== 'string') {
        throw new ApiError('Missing required parameter: path string.', 400);
      }

      // Prevent Directory Traversal
      if (path.includes('..') || path.startsWith('/')) {
        throw new ApiError('Malicious path traversal block activated.', 400);
      }

      // Check ownership or admin/staff privileges
      const pathUserId = path.split('/')[0];
      if (!isAdminOrStaff && pathUserId !== authUser.id) {
        throw new ApiError('Forbidden: You do not have permission to access this storage object.', 403);
      }

      logger.info('Creating single signed URL for storage object', { path });

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(path, 60 * 60 * 24); // 24 hours expiry

      if (error) {
        logger.error('Storage sign url error', error);
        throw new ApiError(error.message, 400);
      }

      return NextResponse.json({ signedUrl: data.signedUrl });

    } else if (actionLower === 'getsignedurls') {
      if (!paths || !Array.isArray(paths)) {
        throw new ApiError('Missing required parameter: paths array.', 400);
      }

      // Check all path variables for traversal signatures
      for (const p of paths) {
        if (typeof p !== 'string' || p.includes('..') || p.startsWith('/')) {
          throw new ApiError('Malicious path traversal block activated on file subset.', 400);
        }
      }

      // Check ownership or admin/staff privileges
      if (!isAdminOrStaff) {
        for (const p of paths) {
          const pathUserId = p.split('/')[0];
          if (pathUserId !== authUser.id) {
            throw new ApiError('Forbidden: You do not have permission to access one or more requested storage objects.', 403);
          }
        }
      }

      logger.info('Creating multiple signed URLs for storage objects', { pathsCount: paths.length });

      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrls(paths, 60 * 60 * 24); // 24 hours expiry

      if (error) {
        logger.error('Storage sign urls error', error);
        throw new ApiError(error.message, 400);
      }

      return NextResponse.json({ signedUrls: data });

    } else if (actionLower === 'delete') {
      if (!path || typeof path !== 'string') {
        throw new ApiError('Missing required parameter: path string.', 400);
      }

      // Block Directory Traversal
      if (path.includes('..') || path.startsWith('/')) {
        throw new ApiError('Malicious path traversal block activated.', 400);
      }

      // Check ownership or admin/staff privileges
      const pathUserId = path.split('/')[0];
      if (!isAdminOrStaff && pathUserId !== authUser.id) {
        throw new ApiError('Forbidden: You do not have permission to delete this storage object.', 403);
      }

      logger.info('Removing storage file', { path });

      const { data, error } = await supabase.storage
        .from(bucketName)
        .remove([path]);

      if (error) {
        logger.error('Storage delete error', error);
        throw new ApiError(error.message, 400);
      }

      logger.info('Storage file deleted successfully', { path });
      return NextResponse.json({ success: true });
    }

    throw new ApiError('Invalid action specified.', 400);
  } catch (err: any) {
    return createErrorResponse(req, err);
  }
}
