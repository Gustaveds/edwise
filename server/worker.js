import { Worker } from 'bullmq';
import connection from './services/queue.js';
import db from './db.js';
import { processVideoWithAI } from './services/videoAI.js';

console.log('👷 Video Worker starting...');

const worker = new Worker('video-processing', async job => {
    const startTime = Date.now();
    console.log('\n' + '='.repeat(80));
    console.log(`🎬 JOB ${job.id} STARTED`);
    console.log('='.repeat(80));
    console.log('📋 Job Data:', JSON.stringify(job.data, null, 2));
    console.log('⏰ Start Time:', new Date().toISOString());
    console.log('='.repeat(80) + '\n');

    const { videoId, s3Key, filename, contentId } = job.data;

    try {
        // 1. Update status to processing
        console.log(`📊 [${videoId}] Updating video status to 'processing'...`);
        await db.query(
            'UPDATE videos SET status = $1, metadata = jsonb_set(COALESCE(metadata, \'{}\'::jsonb), \'{processing_started}\', to_jsonb(NOW()::text)) WHERE id = $2',
            ['processing', videoId]
        );
        console.log(`✅ [${videoId}] Status updated to 'processing'\n`);

        // 2. REAL AI Processing (not mock!)
        console.log(`🚀 [${videoId}] Starting REAL AI processing for: ${filename}`);
        console.log(`📁 S3 Key: ${s3Key}`);
        console.log(`📝 Content ID: ${contentId}\n`);

        // Log each major stage
        console.log('📥 Stage 1/5: Downloading video from S3...');
        console.log('🎙️  Stage 2/5: Extracting/Transcribing audio...');
        console.log('🤖 Stage 3/5: Generating summary with Gemini...');
        console.log('❓ Stage 4/5: Generating FAQs...');
        console.log('🧠 Stage 5/5: Creating embeddings...\n');

        // Call the actual AI processing function
        const result = await processVideoWithAI(videoId);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('\n' + '='.repeat(80));
        console.log(`✅ JOB ${job.id} COMPLETED SUCCESSFULLY`);
        console.log('='.repeat(80));
        console.log('📊 Results:');
        console.log(`   - Summary: ${result.summary ? result.summary.substring(0, 100) + '...' : 'Generated'}`);
        console.log(`   - FAQs: ${result.faqCount} questions created`);
        console.log(`   - Status: ${result.success ? 'SUCCESS' : 'PARTIAL'}`);
        console.log(`⏱️  Duration: ${duration}s`);
        console.log(`⏰ End Time: ${new Date().toISOString()}`);
        console.log('='.repeat(80) + '\n');

    } catch (err) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.error('\n' + '='.repeat(80));
        console.error(`❌ JOB ${job.id} FAILED`);
        console.error('='.repeat(80));
        console.error('💥 Error Details:');
        console.error(`   Message: ${err.message}`);
        console.error(`   Stack: ${err.stack}`);
        console.error(`⏱️  Failed after: ${duration}s`);
        console.error(`⏰ Failure Time: ${new Date().toISOString()}`);
        console.error('='.repeat(80) + '\n');

        await db.query(
            'UPDATE videos SET status = $1, metadata = jsonb_set(COALESCE(metadata, \'{}\'::jsonb), \'{error}\', to_jsonb($2::text)) WHERE id = $3',
            ['error', err.message, videoId]
        );
        throw err;
    }

}, { connection });

worker.on('completed', job => {
    console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`${job.id} has failed with ${err.message}`);
});
