import db from '../db.js';

/**
 * Adds playback-position tracking to the existing `progress` table so the
 * player can resume a video where the student left off. The table already
 * existed (student_id/content_id/status/last_accessed_at) but was never
 * actually read or written anywhere in the app until now.
 */
export default async function runMigration() {
    await db.query(`
        ALTER TABLE progress
        ADD COLUMN IF NOT EXISTS last_position_seconds INTEGER NOT NULL DEFAULT 0;
    `);
    console.log('✅ Column "last_position_seconds" added to "progress".');
}
