import db from '../db.js';
import { generateEmbedding } from './embeddingService.js';

/**
 * Perform vector similarity search in the documents table
 * @param {string} query - User query text
 * @param {number} topK - Number of results to return (default: 25)
 * @returns {Promise<Array>} - Array of relevant documents with metadata
 */
async function searchDocuments(query, topK = 25) {
    try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query);

        // Perform vector similarity search using pgvector
        // Using cosine similarity (<=> operator in pgvector)
        const result = await db.query(
            `SELECT 
        id,
        content,
        metadata,
        (embedding <=> $1::vector) AS distance
      FROM documents
      ORDER BY distance ASC
      LIMIT $2`,
            [`[${queryEmbedding.join(',')}]`, topK]
        );

        return result.rows;
    } catch (error) {
        console.error('Error searching documents:', error);
        throw error;
    }
}

/**
 * Get full SRT transcript for a specific video
 * @param {string} videoId - YouTube video ID
 * @returns {Promise<Object|null>} - Video data with SRT or null if not found
 */
async function getVideoSRT(videoId) {
    try {
        const result = await db.query(
            'SELECT yt_id, title, srt, url FROM videos WHERE yt_id = $1 LIMIT 1',
            [videoId]
        );

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
        const result = await db.query(
            'SELECT yt_id, title, url FROM videos ORDER BY title'
        );
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
