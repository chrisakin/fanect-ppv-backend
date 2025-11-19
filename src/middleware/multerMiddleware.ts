import multer from 'multer';

/**
 * Multer memory storage instance.
 * - Stores uploaded files in memory as Buffer objects so they can be processed
 *   (for example uploaded to S3) before being persisted elsewhere.
 */
const storage = multer.memoryStorage(); // Store files in memory for further processing (e.g., uploading to S3)

/**
 * Multer upload configuration used across routes.
 * - `limits.fileSize` restricts the maximum allowed file size to 5MB.
 * - Uses `storage` (memory) so handlers receive files under `req.files` as Buffers.
 */
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

/**
 * Middleware to accept specific multipart fields used by event upload endpoints.
 * - Accepts up to one file each for `banner`, `watermark`, and `trailer`.
 * - Attach this middleware to routes expecting these fields so `req.files` is populated.
 *
 * Usage example: `router.post('/events', uploadFields, controller.createEvent)`
 */
export const uploadFields = upload.fields([
    { name: 'banner', maxCount: 1 },
    { name: 'watermark', maxCount: 1 },
    { name: 'trailer', maxCount: 1 }
]);