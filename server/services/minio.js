import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: resolve(__dirname, '../../.env') });
}

const s3Client = new S3Client({
    region: 'us-east-1', // MinIO requires a region, even if dummy
    endpoint: process.env.MINIO_SERVER_URL || 'https://s3.tgbia.com',
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || '***REMOVED_MINIO_ACCESS_KEY***',
        secretAccessKey: process.env.MINIO_SECRET_KEY || '***REMOVED_MINIO_SECRET_KEY***',
    },
    forcePathStyle: true, // Needed for MinIO
});

export default s3Client;
