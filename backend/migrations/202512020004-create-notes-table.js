import db from '../db.js';

/**
 * Create notes table
 */
export default async function runMigration() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS notes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
            timestamp DECIMAL(10, 2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_notes_user_course ON notes(user_id, course_id);
        CREATE INDEX idx_notes_video ON notes(video_id);
    `);
    console.log('✅ Table "notes" created.');
}
