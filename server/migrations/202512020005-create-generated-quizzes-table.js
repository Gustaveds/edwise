import db from '../db.js';

/**
 * Create generated_quizzes table
 */
export default async function runMigration() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS generated_quizzes (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            questions JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX idx_generated_quizzes_user_course ON generated_quizzes(user_id, course_id);
    `);
    console.log('✅ Table "generated_quizzes" created.');
}
