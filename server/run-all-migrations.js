import db from './db.js';
import bcrypt from 'bcrypt';

async function run() {
    console.log('\n=== INIT: Core Tables ===');

    await db.query(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'professor', 'student')),
        created_at TIMESTAMP DEFAULT NOW()
    );`);
    console.log('✅ users');

    await db.query(`CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        professor_id INTEGER REFERENCES users(id),
        organization_type TEXT DEFAULT 'custom',
        created_at TIMESTAMP DEFAULT NOW()
    );`);
    console.log('✅ courses');

    await db.query(`CREATE TABLE IF NOT EXISTS modules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        parent_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
        order_index INTEGER DEFAULT 0,
        type TEXT DEFAULT 'folder',
        created_at TIMESTAMP DEFAULT NOW()
    );`);
    console.log('✅ modules');

    await db.query(`CREATE TABLE IF NOT EXISTS contents (
        id SERIAL PRIMARY KEY,
        module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('pdf', 'video', 'text', 'link', 'word', 'quiz')),
        data JSONB DEFAULT '{}',
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
    );`);
    console.log('✅ contents');

    await db.query(`CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, course_id)
    );`);
    console.log('✅ enrollments');

    await db.query(`CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'completed',
        last_accessed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, content_id)
    );`);
    console.log('✅ progress');

    await db.query(`CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );`);
    console.log('✅ comments');

    await db.query('DROP TABLE IF EXISTS video_segments CASCADE');
    await db.query('DROP TABLE IF EXISTS videos CASCADE');

    await db.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    await db.query(`CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        s3_key TEXT,
        status TEXT DEFAULT 'uploading',
        transcription TEXT,
        summary TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );`);
    console.log('✅ videos');

    await db.query(`CREATE TABLE IF NOT EXISTS video_segments (
        id SERIAL PRIMARY KEY,
        video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
        start_time FLOAT NOT NULL,
        end_time FLOAT NOT NULL,
        text TEXT NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT NOW()
    );`);
    console.log('✅ video_segments');

    console.log('\n=== MIGRATION: schema-v2-extensions ===');

    await db.query(`ALTER TABLE contents
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS release_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS release_after_days INTEGER;
    `);
    await db.query(`CREATE TABLE IF NOT EXISTS quizzes (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        passing_score INTEGER DEFAULT 70,
        created_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.query(`CREATE TABLE IF NOT EXISTS quiz_questions (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_type TEXT DEFAULT 'multiple_choice',
        options JSONB NOT NULL,
        order_index INTEGER DEFAULT 0
    );`);
    await db.query(`CREATE TABLE IF NOT EXISTS assignments (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
        max_score INTEGER DEFAULT 100,
        due_date TIMESTAMP,
        instructions TEXT
    );`);
    await db.query(`CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        file_url TEXT,
        text_content TEXT,
        submitted_at TIMESTAMP DEFAULT NOW(),
        grade INTEGER,
        feedback TEXT,
        status TEXT DEFAULT 'pending'
    );`);
    await db.query(`CREATE TABLE IF NOT EXISTS quiz_attempts (
        id SERIAL PRIMARY KEY,
        quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER,
        passed BOOLEAN,
        attempted_at TIMESTAMP DEFAULT NOW(),
        answers JSONB
    );`);
    console.log('✅ schema-v2-extensions');

    console.log('\n=== MIGRATION: documents ===');
    await db.query(`CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        content TEXT,
        metadata JSONB,
        embedding vector(1536)
    );`);
    await db.query(`CREATE OR REPLACE FUNCTION match_documents (
        query_embedding vector(1536),
        match_count int DEFAULT NULL,
        filter jsonb DEFAULT '{}'
    ) RETURNS TABLE (id bigint, content text, metadata jsonb, similarity float)
    LANGUAGE plpgsql AS $$
    #variable_conflict use_column
    BEGIN
        RETURN QUERY
        SELECT id, content, metadata,
            1 - (documents.embedding <=> query_embedding) AS similarity
        FROM documents
        WHERE metadata @> filter
        ORDER BY documents.embedding <=> query_embedding
        LIMIT match_count;
    END;
    $$;`);
    console.log('✅ documents + match_documents');

    console.log('\n=== MIGRATION: chat_history ===');
    await db.query(`CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await db.query(`ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;`);
    await db.query(`ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS video_id INTEGER REFERENCES videos(id) ON DELETE SET NULL;`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_chat_history_user_course ON chat_history(user_id, course_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_chat_history_video ON chat_history(video_id);`);
    console.log('✅ chat_history');

    console.log('\n=== MIGRATION: notes ===');
    await db.query(`CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await db.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;`);
    await db.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE;`);
    await db.query(`ALTER TABLE notes ADD COLUMN IF NOT EXISTS timestamp DECIMAL(10, 2);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_notes_user_course ON notes(user_id, course_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_notes_video ON notes(video_id);`);
    console.log('✅ notes');

    console.log('\n=== MIGRATION: generated_quizzes ===');
    await db.query(`CREATE TABLE IF NOT EXISTS generated_quizzes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        questions JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await db.query(`ALTER TABLE generated_quizzes ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_generated_quizzes_user_course ON generated_quizzes(user_id, course_id);`);
    console.log('✅ generated_quizzes');

    console.log('\n=== MIGRATION: saved_flashcards ===');
    await db.query(`CREATE TABLE IF NOT EXISTS saved_flashcards (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await db.query(`ALTER TABLE saved_flashcards ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;`);
    await db.query(`ALTER TABLE saved_flashcards ADD COLUMN IF NOT EXISTS source VARCHAR(255);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_saved_flashcards_user_course ON saved_flashcards(user_id, course_id);`);
    console.log('✅ saved_flashcards');

    console.log('\n=== MIGRATION: ai_logs ===');
    await db.query(`CREATE TABLE IF NOT EXISTS ai_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        response TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    await db.query(`ALTER TABLE ai_logs ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON ai_logs(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_ai_logs_course_id ON ai_logs(course_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_logs(created_at);`);
    console.log('✅ ai_logs');

    console.log('\n=== Verificando tabelas criadas ===');
    const tables = await db.query(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    `);
    console.log(tables.rows.map(r => r.tablename).join(', '));

    console.log('\n✅ Todas as migrations rodadas com sucesso!');
    process.exit(0);
}

run().catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
});
