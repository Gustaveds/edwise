import db from '../db.js';

/**
 * Create ai_logs table
 */
export default async function runMigration() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS ai_logs (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            response TEXT,
            metadata JSONB DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_ai_logs_course_id ON ai_logs(course_id);
        CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at);
    `);
    console.log('✅ Table "ai_logs" created.');
}
