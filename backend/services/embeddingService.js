import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate embedding for a text using Gemini embedding model
 * Uses gemini-embedding-001 with 1536 dimensions for OpenAI compatibility
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - The embedding vector (1536 dimensions)
 */
async function generateEmbedding(text) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });
        const result = await model.embedContent({
            content: { parts: [{ text }] },
            taskType: 'RETRIEVAL_DOCUMENT',
            outputDimensionality: 1536  // Match OpenAI ada-002 dimensions
        });
        return result.embedding.values;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw error;
    }
}

export {
    generateEmbedding,
};
