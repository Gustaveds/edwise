import db from './db.js';
import bcrypt from 'bcrypt';

async function checkUsers() {
    try {
        console.log('Checking users...');
        const result = await db.query('SELECT * FROM users');
        console.log('Users found:', result.rows.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));

        const admin = result.rows.find(u => u.email === 'admin@edwise.com');
        if (admin) {
            const isMatch = await bcrypt.compare('admin123', admin.password_hash);
            console.log(`Password check for admin@edwise.com (admin123): ${isMatch ? 'MATCH ✅' : 'FAIL ❌'}`);

            if (!isMatch) {
                console.log('Resetting admin password to admin123...');
                const newHash = await bcrypt.hash('admin123', 10);
                await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, admin.id]);
                console.log('Admin password reset.');
            }
        } else {
            console.log('Admin user not found!');
        }

    } catch (error) {
        console.error('Error checking users:', error);
    } finally {
        process.exit();
    }
}

checkUsers();
