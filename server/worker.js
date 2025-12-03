import { Worker } from 'bullmq';
import connection from './services/queue.js';
import db from './db.js';
import { processVideoWithAI } from './services/videoAI.js';

console.log('👷 Video Worker starting...');

// Helper function to check if video still exists
async function videoExists(videoId) {
    const result = await db.query('SELECT id FROM videos WHERE id = $1', [videoId]);
    return result.rows.length > 0;
}

// Helper function to update video stage
async function updateVideoStage(videoId, stage) {
    await db.query(
        `UPDATE videos
         SET metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{current_stage}',
             to_jsonb($1::text)
         ),
         updated_at = NOW()
         WHERE id = $2`,
        [stage, videoId]
    );
}

const worker = new Worker('video-processing', async job => {
    const startTime = Date.now();
    const timestamp = () => new Date().toISOString();

    console.log('\n' + '='.repeat(80));
    console.log(`[VIDEO-PROCESSING] 🎬 JOB ${job.id} STARTED`);
    console.log(`[VIDEO-PROCESSING] ⏰ ${timestamp()}`);
    console.log('='.repeat(80));
    console.log(`[VIDEO-PROCESSING] 📋 Job Data:`, JSON.stringify(job.data, null, 2));
    console.log('='.repeat(80) + '\n');

    const { videoId, s3Key, filename, contentId } = job.data;

    try {
        // 1. Update status to processing
        console.log(`[VIDEO-PROCESSING] [${videoId}] 📊 Updating status to 'processing'...`);
        console.log(`[VIDEO-PROCESSING] [${videoId}] ⏰ ${timestamp()}`);

        await db.query(
            `UPDATE videos 
             SET status = $1, 
                 metadata = jsonb_set(
                     COALESCE(metadata, '{}'::jsonb), 
                     '{processing_started}', 
                     to_jsonb($3::text)
                 )
             WHERE id = $2`,
            ['processing', videoId, timestamp()]
        );

        await updateVideoStage(videoId, 'initializing');
        console.log(`[VIDEO-PROCESSING] [${videoId}] ✅ Status updated to 'processing'\n`);

        // 2. REAL AI Processing
        console.log(`[VIDEO-PROCESSING] [${videoId}] 🚀 Starting AI processing`);
        console.log(`[VIDEO-PROCESSING] [${videoId}] 📁 File: ${filename}`);
        console.log(`[VIDEO-PROCESSING] [${videoId}] 📁 S3 Key: ${s3Key}`);
        console.log(`[VIDEO-PROCESSING] [${videoId}] 📝 Content ID: ${contentId}`);
        console.log(`[VIDEO-PROCESSING] [${videoId}] ⏰ ${timestamp()}\n`);

        // Stage indicators
        console.log(`[VIDEO-PROCESSING] [${videoId}] 📥 Stage 1/5: Downloading video from S3...`);
        await updateVideoStage(videoId, 'downloading');

        console.log(`[VIDEO-PROCESSING] [${videoId}] 🎙️  Stage 2/5: Extracting/Transcribing audio...`);
        // Will be updated by videoAI.js

        console.log(`[VIDEO-PROCESSING] [${videoId}] 🤖 Stage 3/5: Generating summary with Gemini...`);
        // Will be updated by videoAI.js

        console.log(`[VIDEO-PROCESSING] [${videoId}] ❓ Stage 4/5: Generating FAQs...`);
        // Will be updated by videoAI.js

        console.log(`[VIDEO-PROCESSING] [${videoId}] 🧠 Stage 5/5: Creating embeddings...\n`);
        // Will be updated by videoAI.js

        // Call the actual AI processing function with stage updater
        const result = await processVideoWithAI(videoId, updateVideoStage);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('\n' + '='.repeat(80));
        console.log(`[VIDEO-PROCESSING] [${videoId}] ✅ JOB ${job.id} COMPLETED SUCCESSFULLY`);
        console.log(`[VIDEO-PROCESSING] [${videoId}] ⏰ ${timestamp()}`);
        console.log('='.repeat(80));
        console.log(`[VIDEO-PROCESSING] [${videoId}] 📊 Results:`);
        console.log(`[VIDEO-PROCESSING] [${videoId}]    - Summary: ${result.summary ? result.summary.substring(0, 100) + '...' : 'Generated'}`);
        console.log(`[VIDEO-PROCESSING] [${videoId}]    - FAQs: ${result.faqCount} questions created`);
        console.log(`[VIDEO-PROCESSING] [${videoId}]    - Status: ${result.success ? 'SUCCESS' : 'PARTIAL'}`);
        console.log(`[VIDEO-PROCESSING] [${videoId}] ⏱️  Duration: ${duration}s`);
        console.log('='.repeat(80) + '\n');

        await updateVideoStage(videoId, 'complete');

    } catch (err) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('\n' + '='.repeat(80));
        console.log(`[VIDEO-PROCESSING] [${videoId}] ❌ JOB ${job.id} FAILED`);
        console.log(`[VIDEO-PROCESSING] [${videoId}] ⏰ ${timestamp()}`);
        console.log('='.repeat(80));
        console.log(`[VIDEO-PROCESSING] [${videoId}] 💥 Error Details:`);
        console.log(`[VIDEO-PROCESSING] [${videoId}]    Message: ${err.message}`);
        console.log(`[VIDEO-PROCESSING] [${videoId}]    Stack: ${err.stack}`);
        console.log(`[VIDEO-PROCESSING] [${videoId}] ⏱️  Failed after: ${duration}s`);
        console.log('='.repeat(80) + '\n');

        await db.query(
            `UPDATE videos 
             SET status = $1, 
                 metadata = jsonb_set(
                     jsonb_set(
                         COALESCE(metadata, '{}'::jsonb), 
                         '{error}', 
                         to_jsonb($2::text)
                     ),
                     '{current_stage}',
                     to_jsonb('error'::text)
                 )
             WHERE id = $3`,
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
