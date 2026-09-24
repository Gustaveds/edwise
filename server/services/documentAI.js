import { GetObjectCommand } from '@aws-sdk/client-s3';
import s3Client from './minio.js';
import db from '../db.js';
import { generateEmbedding } from './embeddingService.js';

const BUCKET_NAME = process.env.MINIO_BUCKET || 'edwise';
const CHUNK_SIZE = 1500;
const CHUNK_OVERLAP = 200;

async function downloadFileBuffer(s3Key) {
    const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key });
    const response = await s3Client.send(command);
    const chunks = [];
    for await (const chunk of response.Body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function extractText(buffer, contentType, filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();

    if (contentType === 'pdf' || ext === 'pdf') {
        const { PDFParse } = await import('pdf-parse');
        const parser = new PDFParse({ data: buffer });
        try {
            const result = await parser.getText();
            return result.text;
        } finally {
            await parser.destroy();
        }
    }

    if (contentType === 'word' || ext === 'docx' || ext === 'doc') {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
    }

    if (contentType === 'text' || ext === 'txt') {
        return buffer.toString('utf-8');
    }

    return null;
}

function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const chunks = [];
    let start = 0;
    while (start < normalized.length) {
        const end = Math.min(start + size, normalized.length);
        chunks.push(normalized.slice(start, end));
        if (end === normalized.length) break;
        start = end - overlap;
    }
    return chunks;
}

async function updateIndexingStatus(contentId, status, extra = {}) {
    await db.query(
        `UPDATE contents
         SET data = data || $1::jsonb
         WHERE id = $2`,
        [JSON.stringify({ indexing_status: status, ...extra }), contentId]
    );
}

/**
 * Extracts text from an uploaded PDF/Word/text file, chunks it, and stores
 * embeddings in the `documents` table so the RAG pipeline (quizzes,
 * flashcards, chat) can ground answers in the actual material, not just in
 * video transcripts.
 * @param {number} contentId - contents.id of the uploaded file
 */
async function processDocumentWithAI(contentId) {
    const timestamp = () => new Date().toISOString();
    console.log(`[DOCUMENT-AI] [${contentId}] 📄 Starting document indexing — ${timestamp()}`);

    try {
        const contentResult = await db.query(`
            SELECT c.*, m.course_id
            FROM contents c
            JOIN modules m ON c.module_id = m.id
            WHERE c.id = $1
        `, [contentId]);

        if (contentResult.rows.length === 0) {
            throw new Error('Content not found');
        }

        const content = contentResult.rows[0];
        const s3Key = content.data?.s3_key;
        const filename = content.data?.filename || content.title;

        if (!s3Key) {
            console.log(`[DOCUMENT-AI] [${contentId}] ⚠️  No s3_key on content, skipping indexing`);
            await updateIndexingStatus(contentId, 'skipped');
            return { success: false, reason: 'no_s3_key' };
        }

        await updateIndexingStatus(contentId, 'processing');

        console.log(`[DOCUMENT-AI] [${contentId}] 📥 Downloading from S3: ${s3Key}`);
        const buffer = await downloadFileBuffer(s3Key);

        console.log(`[DOCUMENT-AI] [${contentId}] 📝 Extracting text (${content.type})...`);
        const text = await extractText(buffer, content.type, filename);

        if (!text || text.trim().length < 50) {
            console.log(`[DOCUMENT-AI] [${contentId}] ⚠️  No usable text extracted — marking as unindexed`);
            await updateIndexingStatus(contentId, 'error', { indexing_error: 'Não foi possível extrair texto do arquivo (pode ser um PDF escaneado sem OCR).' });
            return { success: false, reason: 'no_text' };
        }

        const chunks = chunkText(text);
        console.log(`[DOCUMENT-AI] [${contentId}] 🧠 Generating embeddings for ${chunks.length} chunks...`);

        let stored = 0;
        for (let i = 0; i < chunks.length; i++) {
            const docContent = `No material "${content.title}": ${chunks[i]}`;
            const metadata = {
                content_id: contentId,
                course_id: content.course_id,
                title: content.title,
                type: 'document',
                chunk_index: i,
            };

            const embedding = await generateEmbedding(docContent);
            await db.query(
                'INSERT INTO documents (content, metadata, embedding) VALUES ($1, $2, $3)',
                [docContent, JSON.stringify(metadata), JSON.stringify(embedding)]
            );
            stored++;
        }

        await updateIndexingStatus(contentId, 'ready', { chunk_count: stored });
        console.log(`[DOCUMENT-AI] [${contentId}] ✅ Indexing complete: ${stored} chunks stored — ${timestamp()}`);

        return { success: true, chunkCount: stored };

    } catch (error) {
        console.error(`[DOCUMENT-AI] [${contentId}] ❌ Error indexing document:`, error.message);
        await updateIndexingStatus(contentId, 'error', { indexing_error: error.message });
        throw error;
    }
}

export { processDocumentWithAI };
