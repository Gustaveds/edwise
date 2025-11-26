const db = require('./db');

async function testSchema() {
    try {
        console.log('Testing database schema...\n');

        // Check videos table structure
        const videosSchema = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'videos'
      ORDER BY ordinal_position
    `);

        console.log('Videos table columns:');
        videosSchema.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        // Check documents table structure
        const docsSchema = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `);

        console.log('\nDocuments table columns:');
        docsSchema.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        // Sample one video
        const sampleVideo = await db.query('SELECT * FROM videos LIMIT 1');
        console.log('\nSample video record:');
        console.log(JSON.stringify(sampleVideo.rows[0], null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

testSchema();
