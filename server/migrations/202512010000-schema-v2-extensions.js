import db from '../db.js';

async function runMigration() {
    await db.query(`
        ALTER TABLE contents
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS release_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS release_after_days INTEGER;
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS quizzes (
            id SERIAL PRIMARY KEY,
            content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            passing_score INTEGER DEFAULT 70,
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS quiz_questions (
            id SERIAL PRIMARY KEY,
            quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
            question_text TEXT NOT NULL,
            question_type TEXT DEFAULT 'multiple_choice',
            options JSONB NOT NULL,
            order_index INTEGER DEFAULT 0
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS assignments (
            id SERIAL PRIMARY KEY,
            content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
            max_score INTEGER DEFAULT 100,
            due_date TIMESTAMP,
            instructions TEXT
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS submissions (
            id SERIAL PRIMARY KEY,
            assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
            student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            file_url TEXT,
            text_content TEXT,
            submitted_at TIMESTAMP DEFAULT NOW(),
            grade INTEGER,
            feedback TEXT,
            status TEXT DEFAULT 'pending'
        );
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS quiz_attempts (
            id SERIAL PRIMARY KEY,
            quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
            student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            score INTEGER,
            passed BOOLEAN,
            attempted_at TIMESTAMP DEFAULT NOW(),
            answers JSONB
        );
    `);

    console.log('✅ schema-v2 extensions applied');
}

export { runMigration };
