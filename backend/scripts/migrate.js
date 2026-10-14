import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

async function initMigrationTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

async function getExecutedMigrations() {
    const result = await db.query('SELECT name FROM migrations');
    return result.rows.map(row => row.name);
}

async function getMigrationFiles() {
    if (!fs.existsSync(MIGRATIONS_DIR)) {
        return [];
    }
    return fs.readdirSync(MIGRATIONS_DIR)
        .filter(file => file.endsWith('.js'))
        .sort(); // Ensure alphabetical order
}

async function runMigrations() {
    try {
        await initMigrationTable();

        const executed = await getExecutedMigrations();
        const files = await getMigrationFiles();

        const pending = files.filter(file => !executed.includes(file));

        if (pending.length === 0) {
            console.log('✨ No pending migrations.');
            return;
        }

        console.log(`📋 Found ${pending.length} pending migrations.`);

        for (const file of pending) {
            console.log(`▶️  Running migration: ${file}...`);

            const filePath = path.join(MIGRATIONS_DIR, file);
            const migrationModule = await import(filePath);

            // Find the first exported function
            const exportKeys = Object.keys(migrationModule);
            const runFn = migrationModule.runMigration ||
                migrationModule.default ||
                migrationModule[exportKeys[0]];

            if (typeof runFn !== 'function') {
                console.error(`❌ Error: No export function found in ${file}`);
                process.exit(1);
            }

            // Execute the migration function
            // We pass the db instance just in case, though most import it directly
            await runFn(db);

            // Record execution
            await db.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
            console.log(`✅ Migration ${file} executed successfully.`);
        }

        console.log('🎉 All migrations executed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        // Don't close the pool here if we want to keep the process alive or if it's shared
        // But for a script, we should probably close it to exit cleanly
        // However, db.js might not expose a close method easily or it might be a singleton pool
        // Let's try to exit explicitly
        process.exit(0);
    }
}

async function showStatus() {
    try {
        await initMigrationTable();
        const executed = await getExecutedMigrations();
        const files = await getMigrationFiles();

        console.log('\n📊 Migration Status:');
        console.log('────────────────────────────────');

        for (const file of files) {
            const isExecuted = executed.includes(file);
            const status = isExecuted ? '✅ Executed' : '⬜ Pending';
            console.log(`${status}  ${file}`);
        }
        console.log('────────────────────────────────\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error checking status:', error);
        process.exit(1);
    }
}

// CLI Argument Handling
const command = process.argv[2];

if (command === 'up') {
    runMigrations();
} else if (command === 'status') {
    showStatus();
} else {
    console.log('Usage: node migrate.js [up|status]');
    process.exit(1);
}
