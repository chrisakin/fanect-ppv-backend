import multer from 'multer';

const storage = multer.memoryStorage(); // Store files in memory for further processing (e.g., uploading to S3)

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

export const uploadFields = upload.fields([
    { name: 'banner', maxCount: 1 },
    { name: 'watermark', maxCount: 1 },
]);