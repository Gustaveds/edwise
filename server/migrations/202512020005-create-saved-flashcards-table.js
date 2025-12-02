import db from '../db.js';

/**
 * Create saved_flashcards table
 */
export default async function runMigration() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS saved_flashcards (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            source VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_saved_flashcards_user_course ON saved_flashcards(user_id, course_id);
    `);
    console.log('✅ Table "saved_flashcards" created.');
}
