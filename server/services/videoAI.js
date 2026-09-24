import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { parseSRT, extractSRTFromFile, downloadVideoFromS3, cleanupFiles } from './extractSRT.js';
import db from '../db.js';
import { generateEmbedding } from './embeddingService.js';
import { generateContentWithRetry } from './geminiRetry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate the video summary AND the FAQ list in a single Gemini call.
 * Previously this was 1 call for the summary + 1 call per 3-minute batch of
 * FAQs (e.g. 5 calls for a 10-minute video) — merging them into one call
 * cuts Gemini usage per video down to the minimum, which matters a lot
 * against the free tier's daily request quota.
 * @param {string} srtContent - Full SRT/transcript text
 * @param {string} title - Video title
 * @returns {Promise<{summary: string, faqs: Array<{pergunta: string, tempo: string}>}>}
 */
async function generateSummaryAndFAQs(srtContent, title) {
    try {
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
            systemInstruction: `Você é um assistente educacional experiente em programação e automação/agentes de IA. Você recebe a transcrição completa de um vídeo e produz, em uma ÚNICA resposta, duas coisas: um resumo e uma lista de perguntas frequentes com timestamps.

# Parte 1 — Resumo
Crie um resumo detalhado do vídeo em Markdown, destacando os principais tópicos, ferramentas mencionadas (indicando o tempo de cada uma, formato t=2m47s) e o passo a passo. Evite listar a plataforma n8n a menos que seja absolutamente relevante. Não comece o resumo com "\`\`\`markdown".

# Parte 2 — Perguntas Frequentes (FAQs)
Analise a transcrição do início ao fim (não só o começo) e crie várias perguntas cobrindo o vídeo INTEIRO, como um aluno perguntaria. Para cada pergunta, indique em qual minuto e segundo a resposta aparece, no formato do YouTube: apenas UM valor de hora (opcional), UM valor de minuto (opcional) e UM valor de segundo, cada um com sua letra uma única vez. Exemplos CORRETOS: "t=15m10s", "t=45s", "t=1h5m30s". Exemplos ERRADOS (nunca faça isso): "t=0m15m10s", "t=15m10s20s". Gere aproximadamente 2 a 4 perguntas para cada 3 minutos de conteúdo do vídeo, distribuídas ao longo de toda a duração — não concentre todas no início. Não crie perguntas cuja resposta não esteja presente na transcrição.

# Formato de resposta
Responda APENAS com um JSON válido, sem "\`\`\`json" no começo nem "\`\`\`" no final, seguindo exatamente este formato:
{
  "summary": "<resumo em markdown, com \\n para quebras de linha>",
  "faqs": [ { "pergunta": string, "tempo": string }, ... ]
}`
        });

        const prompt = `<title>
${title}
</title>

<transcricao_completa>
${srtContent}
</transcricao_completa>`;

        const result = await generateContentWithRetry(model, prompt);
        const cleaned = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        return {
            summary: typeof parsed.summary === 'string' ? parsed.summary : '',
            faqs: Array.isArray(parsed.faqs) ? parsed.faqs : []
        };
    } catch (error) {
        console.error('Error generating summary+FAQs:', error);
        throw error;
    }
}

/**
 * Main function to process video with AI
 * @param {number} videoId - Video ID from database
 * @param {Function} updateStage - Optional callback to update processing stage
 * @returns {Promise<Object>} - Processing results
 */
async function processVideoWithAI(videoId, updateStage = null) {
    let tempFiles = [];
    const processingStartTime = Date.now();
    const timestamp = () => new Date().toISOString();

    try {
        console.log(`\n${'▶'.repeat(40)}`);
        console.log(`[VIDEO-AI] [${videoId}] 🎥 STARTING AI PROCESSING`);
        console.log(`[VIDEO-AI] [${videoId}] ⏰ ${timestamp()}`);
        console.log(`${'▶'.repeat(40)}\n`);

        // 1. Get video info from database
        console.log(`[VIDEO-AI] [${videoId}] 📋 [1/6] Fetching video metadata from database...`);
        const videoResult = await db.query('SELECT * FROM videos WHERE id = $1', [videoId]);
        if (videoResult.rows.length === 0) {
            throw new Error('Video not found');
        }

        const video = videoResult.rows[0];
        const contentResult = await db.query(`
            SELECT c.*, m.course_id 
            FROM contents c 
            JOIN modules m ON c.module_id = m.id 
            WHERE c.id = $1
        `, [video.content_id]);
        const content = contentResult.rows[0];
        console.log(`[VIDEO-AI] [${videoId}] ✅ Video metadata loaded: "${content.title}" (Course ID: ${content.course_id})`);
        console.log(`[VIDEO-AI] [${videoId}]    S3 Key: ${video.s3_key}\n`);

        // 2. Download video from S3
        console.log(`[VIDEO-AI] [${videoId}] 📥 [2/6] Downloading video from S3...`);
        console.log(`[VIDEO-AI] [${videoId}] ⏰ ${timestamp()}`);
        if (updateStage) await updateStage(videoId, 'downloading');

        const downloadStart = Date.now();
        const videoPath = await downloadVideoFromS3(video.s3_key);
        const downloadDuration = ((Date.now() - downloadStart) / 1000).toFixed(2);
        tempFiles.push(videoPath);
        console.log(`[VIDEO-AI] [${videoId}] ✅ Video downloaded in ${downloadDuration}s`);
        console.log(`[VIDEO-AI] [${videoId}]    Path: ${videoPath}\n`);

        // ... (rest of the file until loop)

        // 3. Extract SRT
        console.log(`[VIDEO-AI] [${videoId}] 🎙️  [3/6] Extracting subtitles/transcription...`);
        console.log(`[VIDEO-AI] [${videoId}] ⏰ ${timestamp()}`);
        if (updateStage) await updateStage(videoId, 'transcribing');

        const srtStart = Date.now();
        let srtContent = await extractSRTFromFile(videoPath);

        // If no SRT, use Whisper for transcription (local, free)
        if (!srtContent) {
            console.log(`[VIDEO-AI] [${videoId}] ⚠️  No embedded SRT found in video file`);
            console.log(`[VIDEO-AI] [${videoId}] 🎤 Using Whisper for audio transcription (this may take several minutes)...`);

            // Check if video has audio stream before attempting extraction.
            // Note: @ffmpeg-installer/ffmpeg only bundles the ffmpeg binary, not
            // ffprobe, so we probe with `ffmpeg -i` and parse the stream info it
            // prints to stderr (ffmpeg always exits non-zero without an output file).
            const audioPath = videoPath.replace('.mp4', '.mp3');
            const fs = await import('fs');
            const { createRequire } = await import('module');
            const require = createRequire(import.meta.url);
            const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
            const { execFile } = await import('child_process');
            const { promisify } = await import('util');
            const execFileAsync = promisify(execFile);

            let hasAudio = false;
            try {
                await execFileAsync(ffmpegInstaller.path, ['-i', videoPath]);
            } catch (probeError) {
                hasAudio = /Stream #\d+:\d+.*Audio:/i.test(probeError.stderr || '');
            }

            if (!hasAudio) {
                console.log(`[VIDEO-AI] [${videoId}] ⚠️  Video has no audio stream — skipping transcription`);
            } else {
                console.log(`[VIDEO-AI] [${videoId}] 🔊 Extracting audio from video...`);
                await new Promise((resolve, reject) => {
                    const ffmpeg = require('fluent-ffmpeg');
                    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
                    ffmpeg(videoPath)
                        .output(audioPath)
                        .audioCodec('libmp3lame')
                        .on('end', () => {
                            const stats = fs.statSync(audioPath);
                            const audioSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                            console.log(`[VIDEO-AI] [${videoId}] ✅ Audio extracted: ${audioSizeMB}MB`);
                            resolve();
                        })
                        .on('error', reject)
                        .run();
                });

                tempFiles.push(audioPath);

                console.log(`[VIDEO-AI] [${videoId}] 🧠 Starting Whisper transcription (model: medium)...`);
                const whisperStart = Date.now();
                const { transcribeWithWhisper } = await import('./extractSRT.js');
                srtContent = await transcribeWithWhisper(audioPath);
                const whisperDuration = ((Date.now() - whisperStart) / 1000).toFixed(2);

                console.log(`[VIDEO-AI] [${videoId}] ✅ Whisper transcription completed in ${whisperDuration}s`);
                console.log(`[VIDEO-AI] [${videoId}]    Transcript length: ${srtContent.length} characters\n`);
            }
        } else {
            const srtDuration = ((Date.now() - srtStart) / 1000).toFixed(2);
            console.log(`[VIDEO-AI] [${videoId}] ✅ SRT subtitles extracted in ${srtDuration}s`);
            console.log(`[VIDEO-AI] [${videoId}]    Transcript length: ${srtContent.length} characters\n`);
        }

        // 4. Parse SRT
        console.log(`[VIDEO-AI] [${videoId}] 📝 [4/6] Parsing transcript into structured format...`);
        const parsedSrt = parseSRT(srtContent);
        const minuteCount = Object.keys(parsedSrt).length;
        console.log(`[VIDEO-AI] [${videoId}] ✅ Transcript parsed: ${minuteCount} minutes of content\n`);

        // 5-6. Generate summary AND FAQs in a single Gemini call (see
        // generateSummaryAndFAQs — cuts request count vs. one call for the
        // summary plus one per 3-minute FAQ batch).
        console.log(`[VIDEO-AI] [${videoId}] 🤖 [5/6] Generating AI summary + FAQs with Gemini (chamada única)...`);
        console.log(`[VIDEO-AI] [${videoId}] ⏰ ${timestamp()}`);
        if (updateStage) await updateStage(videoId, 'generating_summary');

        const genStart = Date.now();
        const { summary, faqs } = await generateSummaryAndFAQs(srtContent, content.title);
        const genDuration = ((Date.now() - genStart) / 1000).toFixed(2);
        console.log(`[VIDEO-AI] [${videoId}] ✅ Summary + ${faqs.length} FAQs generated in ${genDuration}s`);
        console.log(`[VIDEO-AI] [${videoId}]    Summary length: ${summary.length} characters\n`);

        if (updateStage) await updateStage(videoId, 'generating_faqs');

        // 7. Generate and store embeddings in documents table
        console.log(`[VIDEO-AI] [${videoId}] 🧠 [7/7] Generating and storing embeddings...`);
        console.log(`[VIDEO-AI] [${videoId}] ⏰ ${timestamp()}`);
        if (updateStage) await updateStage(videoId, 'creating_embeddings');

        const embeddingStart = Date.now();
        const contentId = video.content_id;

        // Get video URL from content metadata
        const videoUrl = content.data?.s3_key ?
            `${process.env.MINIO_SERVER_URL}/${process.env.MINIO_BUCKET}/${content.data.s3_key}` :
            '';

        let embeddingCount = 0;
        const totalFaqs = faqs.length;

        console.log(`[VIDEO-AI] [${videoId}] 🧠 Processing ${totalFaqs} FAQ embeddings...`);

        for (const faq of faqs) {
            embeddingCount++;

            // Log every embedding for detailed progress
            if (embeddingCount % 5 === 0 || embeddingCount === 1 || embeddingCount === totalFaqs) {
                console.log(`[VIDEO-AI] [${videoId}]    📊 Creating embedding ${embeddingCount}/${totalFaqs}...`);
            }

            // Prepend title to content for better context matching
            const docContent = `No vídeo ${content.title}. ${faq.pergunta} tempo: ${faq.tempo}`;
            const metadata = {
                video_url: videoUrl,
                video_id: videoId,
                content_id: contentId,
                course_id: content.course_id, // Added course_id for filtering
                title: content.title,
                tempo: faq.tempo
            };

            // Generate embedding
            const embedding = await generateEmbedding(docContent);

            // Store in documents table
            await db.query(
                'INSERT INTO documents (content, metadata, embedding) VALUES ($1, $2, $3)',
                [docContent, JSON.stringify(metadata), JSON.stringify(embedding)]
            );
        }

        const embeddingDuration = ((Date.now() - embeddingStart) / 1000).toFixed(2);
        console.log(`[VIDEO-AI] [${videoId}] ✅ All ${faqs.length} FAQ embeddings stored in ${embeddingDuration}s\n`);

        // 8. Update videos table
        console.log(`[VIDEO-AI] [${videoId}] 💾 Updating database with processed data...`);
        if (updateStage) await updateStage(videoId, 'finalizing');

        await db.query(
            `UPDATE videos 
             SET transcription = $1, 
                 summary = $2, 
                 metadata = jsonb_set(metadata, '{faq}', $3::jsonb),
                 status = 'ready',
                 updated_at = NOW()
             WHERE id = $4`,
            [srtContent, summary, JSON.stringify(faqs), videoId]
        );
        console.log(`[VIDEO-AI] [${videoId}] ✅ Database updated with AI-generated content\n`);

        // 9. Cleanup temp files
        console.log(`[VIDEO-AI] [${videoId}] 🧹 Cleaning up temporary files...`);
        cleanupFiles(tempFiles);
        console.log(`[VIDEO-AI] [${videoId}] ✅ Temporary files cleaned\n`);

        const totalDuration = ((Date.now() - processingStartTime) / 1000).toFixed(2);
        console.log(`${'▶'.repeat(40)}`);
        console.log(`[VIDEO-AI] [${videoId}] ✅ VIDEO PROCESSING COMPLETED SUCCESSFULLY`);
        console.log(`[VIDEO-AI] [${videoId}] ⏰ ${timestamp()}`);
        console.log(`[VIDEO-AI] [${videoId}]    Total Duration: ${totalDuration}s`);
        console.log(`[VIDEO-AI] [${videoId}]    Summary: ${summary.substring(0, 80)}...`);
        console.log(`[VIDEO-AI] [${videoId}]    FAQs: ${faqs.length} questions`);
        console.log(`[VIDEO-AI] [${videoId}]    Embeddings: ${faqs.length} stored`);
        console.log(`${'▶'.repeat(40)}\n`);

        return {
            success: true,
            summary,
            faqCount: faqs.length,
            message: 'Video processed successfully with AI'
        };

    } catch (error) {
        console.log(`[VIDEO-AI] [${videoId}] ❌ Error processing video with AI:`, error.message);
        console.log(`[VIDEO-AI] [${videoId}] ⏰ ${timestamp()}`);

        // Cleanup temp files on error
        cleanupFiles(tempFiles);

        // Update video status to error
        if (updateStage) await updateStage(videoId, 'error');

        await db.query(
            'UPDATE videos SET status = $1, metadata = jsonb_set(metadata, \'{error}\', $2::jsonb) WHERE id = $3',
            ['error', JSON.stringify(error.message), videoId]
        );

        throw error;
    }
}

export {
    processVideoWithAI,
    generateSummaryAndFAQs
};
