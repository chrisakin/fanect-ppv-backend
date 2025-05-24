import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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
        const fileName = `${folder}/${uuidv4()}-${file.name}`;
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME as string,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
        };

        await s3.send(new PutObjectCommand(params));
        // Construct the file URL manually
        const fileUrl = `https://${params.Bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        return fileUrl;
    }
}

export default new S3Service();