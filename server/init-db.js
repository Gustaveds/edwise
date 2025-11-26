import db from './db.js';
import bcrypt from 'bcrypt';

async function initDb() {
  try {
    console.log('Initializing database tables...');

    // 1. Users Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'professor', 'student')),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table "users" created.');

    // 2. Courses Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        professor_id INTEGER REFERENCES users(id),
        organization_type TEXT DEFAULT 'custom',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table "courses" created.');

    // 3. Modules Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id SERIAL PRIMARY KEY,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        parent_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
        order_index INTEGER DEFAULT 0,
        type TEXT DEFAULT 'folder',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table "modules" created.');

    // 4. Contents Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS contents (
        id SERIAL PRIMARY KEY,
        module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('pdf', 'video', 'text', 'link', 'word', 'quiz')),
        data JSONB DEFAULT '{}',
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table "contents" created.');

    // 5. Enrollments Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
        enrolled_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, course_id)
      );
    `);
    console.log('✅ Table "enrollments" created.');

    // 6. Progress Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'completed',
        last_accessed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, content_id)
      );
    `);
    console.log('✅ Table "progress" created.');

    // 7. Comments Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content_id INTEGER REFERENCES contents(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Table "comments" created.');

    // Keep existing tables for backward compatibility if needed, or migration
    // Quizzes table might need adjustment to link to contents if we treat quiz as content
    // For now, let's keep the old tables but maybe we won't use them directly in the new flow
    // or we migrate them. The user didn't ask to migrate old data, just "improve".
    // We'll leave the old tables alone for now to avoid breaking anything existing unexpectedly.

    // Create Default Admin if not exists
    const adminEmail = 'admin@edwise.com';
    const adminCheck = await db.query('SELECT * FROM users WHERE email = $1', [adminEmail]);

    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['Admin User', adminEmail, hashedPassword, 'admin']
      );
      console.log('✅ Default Admin created: admin@edwise.com / admin123');
    }

  } catch (error) {
    console.error('❌ Error initializing database:', error);
  } finally {
    process.exit();
  }
}

initDb();
