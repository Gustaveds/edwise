import db from '../db.js';
import { generateEmbedding } from './embeddingService.js';

/**
 * Perform vector similarity search in the documents table
 * @param {string} query - User query text
 * @param {number} topK - Number of results to return (default: 25)
 * @returns {Promise<Array>} - Array of relevant documents with metadata
 */
async function searchDocuments(query, topK = 25, filter = {}) {
    try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);

        // Perform vector similarity search using pgvector
        // Using cosine similarity (<=> operator in pgvector)
        let sql = `SELECT 
        id,
        content,
        metadata,
        (embedding <=> $1::vector) AS distance
      FROM documents`;

        const params = [`[${queryEmbedding.join(',')}]`, topK];

        if (Object.keys(filter).length > 0) {
            sql += ` WHERE metadata @> $3`;
            params.push(JSON.stringify(filter));
        }

        sql += ` ORDER BY distance ASC LIMIT $2`;

        const result = await db.query(sql, params);

        return result.rows;
    } catch (error) {
        console.error('Error searching documents:', error);
        throw error;
    }
}

/**
 * Get full SRT transcript for a specific video
 * @param {string|number} videoId - Video ID
 * @returns {Promise<Object|null>} - Video data with transcription or null if not found
 */
async function getVideoSRT(videoId) {
    try {
        const result = await db.query(`
            SELECT v.id, c.title, v.transcription, v.filename, v.s3_key
            FROM videos v
            JOIN contents c ON v.content_id = c.id
            WHERE v.id = $1
            LIMIT 1
        `, [videoId]);

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error('Error fetching video SRT:', error);
        throw error;
    }
}

/**
 * Get list of all videos
 * @returns {Promise<Array>} - Array of all videos with basic info
 */
async function getAllVideos() {
    try {
        const result = await db.query(`
            SELECT v.id, c.title, v.filename, v.s3_key
            FROM videos v
            JOIN contents c ON v.content_id = c.id
            ORDER BY c.title
        `);
        return result.rows;
    } catch (error) {
        console.error('Error fetching videos:', error);
        throw error;
    }
}

export {
    searchDocuments,
    getVideoSRT,
    getAllVideos,
};
