import db from './server/db.js';

async function checkUsers() {
    try {
        const res = await db.query('SELECT id, name, email, role FROM users');
        console.log('Users found:', res.rows);
    } catch (err) {
        console.error('Error querying users:', err);
    } finally {
        process.exit();
    }
}

checkUsers();
