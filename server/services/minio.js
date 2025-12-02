import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: resolve(__dirname, '../../.env') });
}

// Validar variáveis obrigatórias
const requiredEnvVars = [
    'MINIO_SERVER_URL',
    'MINIO_ACCESS_KEY',
    'MINIO_SECRET_KEY'
];

for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
        throw new Error(`❌ Variável de ambiente obrigatória não configurada: ${varName}`);
    }
}

const s3Client = new S3Client({
    region: 'us-east-1', // MinIO requires a region, even if dummy
    endpoint: process.env.MINIO_SERVER_URL,
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY,
        secretAccessKey: process.env.MINIO_SECRET_KEY,
    },
    forcePathStyle: true, // Needed for MinIO
});

console.log('✓ MinIO S3 Client configurado:', process.env.MINIO_SERVER_URL);

export default s3Client;
