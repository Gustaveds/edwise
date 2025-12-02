import db from '../db.js';

/**
 * Create documents table with vector extension for embeddings
 */
async function createDocumentsTable() {
    try {
        // Enable pgvector extension
        await db.query('CREATE EXTENSION IF NOT EXISTS vector;');
        console.log('✅ pgvector extension enabled');

        // Create documents table
        await db.query(`
            CREATE TABLE IF NOT EXISTS documents (
                id SERIAL PRIMARY KEY,
                content TEXT,
                metadata JSONB,
                embedding vector(1536)
            );
        `);
        console.log('✅ Table "documents" created');

        // Create function to search for documents
        await db.query(`
            CREATE OR REPLACE FUNCTION match_documents (
                query_embedding vector(1536),
                match_count int DEFAULT NULL,
                filter jsonb DEFAULT '{}'
            ) RETURNS TABLE (
                id bigint,
                content text,
                metadata jsonb,
                similarity float
            )
            LANGUAGE plpgsql
            AS $$
            #variable_conflict use_column
            BEGIN
                RETURN QUERY
                SELECT
                    id,
                    content,
                    metadata,
                    1 - (documents.embedding <=> query_embedding) AS similarity
                FROM documents
                WHERE metadata @> filter
                ORDER BY documents.embedding <=> query_embedding
                LIMIT match_count;
            END;
            $$;
        `);
        console.log('✅ Function "match_documents" created');

    } catch (error) {
        console.error('Error creating documents table:', error);
        throw error;
    }
}

/**
 * Add documents migration to init-db
 */
async function runMigration() {
    await createDocumentsTable();
    console.log('✅ Documents migration complete');
    process.exit(0);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runMigration();
}

export { createDocumentsTable };
