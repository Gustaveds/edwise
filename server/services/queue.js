import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Força carregar .env antes de qualquer outra coisa
dotenv.config({ path: resolve(__dirname, '../../.env') });

console.log('🔧 [QUEUE] Configurando Redis com:');
console.log(`   REDIS_HOST: ${process.env.REDIS_HOST || 'redis'}`);
console.log(`   REDIS_PORT: ${process.env.REDIS_PORT || '6379'}`);
console.log(`   REDIS_DB: ${process.env.REDIS_DB || '0'}`);
console.log(`   HAS_PASSWORD: ${process.env.REDIS_PASSWORD ? 'YES' : 'NO'}`);

const connection = new IORedis({
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        if (times > 3) {
            console.error(`❌ [QUEUE] Redis connection failed after ${times} retries`);
            return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

connection.on('connect', () => {
    console.log('✅ [QUEUE] Redis connected successfully');
});

connection.on('error', (err) => {
    console.error('❌ [QUEUE] Redis connection error:', err.message);
});

export const videoQueue = new Queue('video-processing', { connection });

videoQueue.on('waiting', (job) => {
    console.log(`⏳ [QUEUE] Job ${job.id} aguardando na fila 'video-processing'`);
});

videoQueue.on('error', (err) => {
    console.error('❌ [QUEUE] Erro na fila video-processing:', err.message);
});

export default connection;
