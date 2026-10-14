import db from '../db.js';

/**
 * Create chat_history table
 */
export default async function runMigration() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS chat_history (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            response TEXT NOT NULL,
            video_id INTEGER REFERENCES videos(id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_chat_history_user_course ON chat_history(user_id, course_id);
        CREATE INDEX idx_chat_history_video ON chat_history(video_id);
    `);
    console.log('✅ Table "chat_history" created.');
}
