import { S3Client, PutObjectCommand, ObjectCannedACL, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({
    region: process.env.AWS_REGION as string,
    credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEYID as string,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY as string,
    },
});

class S3Service {
    async uploadFile(file: any, folder: string): Promise<string> {
        const fileName = `${folder}/${uuidv4()}-${file.originalname}`;
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME as string,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
            ACL: ObjectCannedACL.public_read
        };

        await s3.send(new PutObjectCommand(params));
        // Construct the file URL manually
        const fileUrl = `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        return fileUrl;
    }

     async deleteFile(key: string): Promise<void> {
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME as string,
            Key: key,
        };
        await s3.send(new DeleteObjectCommand(params));
    }

    async getS3KeyFromUrl(url: string): Promise<string> {
    // Example: https://your-bucket.s3.us-east-2.amazonaws.com/folder/uuid-filename.jpg
    const urlParts = url.split('.amazonaws.com/');
    return urlParts[1]; // This is the key: folder/uuid-filename.jpg
    }
}

export default new S3Service();