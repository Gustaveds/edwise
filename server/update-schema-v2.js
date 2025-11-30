import db from './db.js';

async function updateSchema() {
    try {
        console.log('Starting schema update (v2)...');

        // 1. Update 'contents' table
        console.log('Updating "contents" table...');
        await db.query(`
      ALTER TABLE contents 
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS release_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS release_after_days INTEGER;
    `);
        console.log('✅ "contents" table updated.');

        // 2. Create 'quizzes' table
        console.log('Creating "quizzes" table...');
        await db.query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        passing_score INTEGER DEFAULT 70,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log('✅ "quizzes" table created.');

        // 3. Create 'quiz_questions' table
        console.log('Creating "quiz_questions" table...');
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
        console.log('✅ "quiz_questions" table created.');

        // 4. Create 'assignments' table
        console.log('Creating "assignments" table...');
        await db.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
        max_score INTEGER DEFAULT 100,
        due_date TIMESTAMP,
        instructions TEXT
      );
    `);
        console.log('✅ "assignments" table created.');

        // 5. Create 'submissions' table
        console.log('Creating "submissions" table...');
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
        console.log('✅ "submissions" table created.');

        // 6. Create 'quiz_attempts' table
        console.log('Creating "quiz_attempts" table...');
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
        console.log('✅ "quiz_attempts" table created.');

        console.log('🎉 Schema update completed successfully!');

    } catch (error) {
        console.error('❌ Error updating schema:', error);
    } finally {
        process.exit();
    }
}

updateSchema();
