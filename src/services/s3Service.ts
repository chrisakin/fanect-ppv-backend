import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

class S3Service {
    async uploadFile(file: any, folder: string): Promise<string> {
        const fileName = `${folder}/${uuidv4()}-${file.name}`;
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME || '',
            Key: fileName,
            Body: file.data,
            ContentType: file.mimetype,
        };

        const uploadResult = await s3.upload(params).promise();
        return uploadResult.Location;
    }
}

export default new S3Service();