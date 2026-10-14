import db from './db.js';
import bcrypt from 'bcrypt';

const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';
if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn('⚠️  SEED_ADMIN_PASSWORD não definida — usando senha padrão de desenvolvimento "admin123". Defina essa variável antes de rodar isso contra um banco real.');
}

const SEEDS = [
    { name: 'Admin User',     email: 'admin@edwise.ai',     role: 'admin',     password: ADMIN_PASSWORD },
    { name: 'Professor Test', email: 'professor@edwise.ai', role: 'professor', password: '123456' },
    { name: 'Student Test',   email: 'student@edwise.ai',   role: 'student',   password: '123456' },
];

async function createTestUsers() {
    try {
        for (const { name, email, role, password } of SEEDS) {
            const passwordHash = await bcrypt.hash(password, 10);
            const result = await db.query(
                `INSERT INTO users (name, email, password_hash, role)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (email) DO NOTHING
                 RETURNING id`,
                [name, email, passwordHash, role]
            );

            if (result.rows.length > 0) {
                console.log(`✅ Created ${role}: ${email} / ${password} (ID: ${result.rows[0].id})`);
            } else {
                console.log(`✓ ${role} ${email} already exists — skipping`);
            }
        }
    } catch (err) {
        console.error('❌ Error creating test users:', err);
        process.exitCode = 1;
    } finally {
        process.exit();
    }
}

createTestUsers();
