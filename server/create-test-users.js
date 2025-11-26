import db from './db.js';
import bcrypt from 'bcrypt';

async function createTestUsers() {
    try {
        const passwordHash = await bcrypt.hash('123456', 10);

        // Create Professor
        const prof = await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
            ['Professor Test', 'professor@edwise.ai', passwordHash, 'professor']
        );
        console.log(`✅ Created Professor: professor@edwise.ai / 123456 (ID: ${prof.rows[0].id})`);

        // Create Student
        const student = await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
            ['Student Test', 'student@edwise.ai', passwordHash, 'student']
        );
        console.log(`✅ Created Student: student@edwise.ai / 123456 (ID: ${student.rows[0].id})`);

    } catch (err) {
        if (err.code === '23505') {
            console.log('⚠️ Users already exist.');
        } else {
            console.error('❌ Error creating users:', err);
        }
    } finally {
        process.exit();
    }
}

createTestUsers();
