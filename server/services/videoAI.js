import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { parseSRT, extractSRTFromFile, downloadVideoFromS3, cleanupFiles } from './extractSRT.js';
import db from '../db.js';
import { generateEmbedding } from './embeddingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate summary of video using Gemini
 * @param {string} captions - Full SRT/captions text
 * @param {string} title - Video title
 * @returns {Promise<string>} - Video summary in Markdown
 */
async function generateSummary(captions, title) {
    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            systemInstruction: `Você é um resumidor de vídeo educacional experiente. Você possui muita experiência em programação e desenvolvimento de automação e agentes de IA.

Sua função é criar um resumo do vídeo e listar todas as ferramentas utilizadas no vídeo indicando em qual tempo ela foi mencionada com uma breve descrição.

Evite listar a plataforma n8n na lista de ferramentas a menos que seja absolutamente relevante.

Escreva sua resposta no formato MARKDOWN seguindo o template abaixo:

# Título do vídeo

## Resumo
[Resumo detalhado do conteúdo do vídeo, destacando os principais tópicos, ferramentas, utilidade e passo a passo. O resumo deve ser objetivo e conciso.]

## Ferramentas
- **Ferramenta 1** (t=2m47s): Breve descrição e como foi utilizada
- **Ferramenta 2** (t=5m30s): Breve descrição e como foi utilizada

Não comece com "\`\`\`markdown"`
        });

        const prompt = `<title>
${title}
</title>

<captions>
${captions}
</captions>`;

        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Error generating summary:', error);
        throw error;
    }
}

/**
 * Generate FAQs based on SRT chunks with timestamps
 * @param {Object} parsedSrt - Parsed SRT grouped by minutes
 * @param {string} title - Video title
 * @param {string} summary - Video summary
 * @returns {Promise<Array>} - Array of FAQ objects with pergunta and tempo
 */
async function generateFAQs(parsedSrt, title, summary, videoId = null, updateStage = null) {
    const allFaqs = [];

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            systemInstruction: `<RESUMO_VIDEO>
${summary}
</RESUMO_VIDEO>

<TITULO_VIDEO>
${title}
</TITULO_VIDEO>

# Sua função
Você é um analista de texto experiente. Sua função é analisar o texto em <SRT>. Tendo em consideração também o <RESUMO_VIDEO> e <TITULO_VIDEO>, crie várias perguntas baseado em como o aluno iria perguntar. Juntamente com a pergunta, indique em qual minuto e segundo do vídeo estará a resposta, utilizando o formato &t do YouTube. Exemplo t=15m10s e inclua esta informação na chave "tempo".

# Objetivo
Seu objetivo é analisar com precisão o texto e contexto e criar perguntas cuja resposta está indicada neste tempo. Apenas crie perguntas que sejam relevantes para este tempo. Tenha também como referência o <RESUMO_VIDEO> e <TITULO_VIDEO> para analisar perguntas que tenham relação a eles também.

# Variações
Crie variações de perguntas baseado no <TITULO_VIDEO> e <RESUMO_VIDEO> caso faça sentido. Caso não fizer sentido, não crie as variações.

# Evite
Não crie perguntas cuja resposta não esteja presente em <SRT>.
Não comece a resposta com "\`\`\`json". Responda apenas usando o formato em JSON.

# Formato
Responda apenas utilizando o formato JSON, sem aspas, sem "\`\`\`json" no começo e sem "\`\`\`" no final. Utilize a Schema abaixo:
[
    {
        "pergunta": string,
        "tempo": string
    }
]`
        });

        // Process in batches (every 3 minutes of video)
        const minutes = Object.keys(parsedSrt).map(Number).sort((a, b) => a - b);
        const totalBatches = Math.ceil(minutes.length / 3);

        if (videoId) {
            console.log(`[VIDEO-AI] [${videoId}] ❓ Starting FAQ generation: ${totalBatches} batches to process`);
        }

        for (let i = 0; i < minutes.length; i += 3) {
            const batchNumber = Math.floor(i / 3) + 1;
            const batchMinutes = minutes.slice(i, i + 3);
            const srtChunk = batchMinutes.map(min => {
                return parsedSrt[min].map((item, idx) =>
                    `${idx + 1}\n\n${item.time}\n${item.text}\n`
                ).join('\n');
            }).join('\n');

            const prompt = `<SRT>
${srtChunk}
</SRT>`;

            try {
                if (videoId) {
                    console.log(`[VIDEO-AI] [${videoId}] ❓ Generating FAQs batch ${batchNumber}/${totalBatches} (minutes ${batchMinutes[0]}-${batchMinutes[batchMinutes.length - 1]})...`);
                }

                const result = await model.generateContent(prompt);
                const responseText = result.response.text();

                // Parse JSON response
                const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const faqs = JSON.parse(cleanText);
                if (Array.isArray(faqs)) {
                    allFaqs.push(...faqs);
                    if (videoId) {
                        console.log(`[VIDEO-AI] [${videoId}] ✅ Batch ${batchNumber}/${totalBatches} completed: +${faqs.length} FAQs (total: ${allFaqs.length})`);
                    }
                }
            } catch (error) {
                if (videoId) {
                    console.error(`[VIDEO-AI] [${videoId}] ⚠️  Error in batch ${batchNumber}/${totalBatches}:`, error.message);
                }
                // Continue to next batch
            }
        }

        if (videoId) {
            console.log(`[VIDEO-AI] [${videoId}] ✅ FAQ generation complete: ${allFaqs.length} total FAQs generated`);
        }

        return allFaqs;
    } catch (error) {
        console.error('Error generating FAQs:', error);
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

            // Check if video has audio stream before attempting extraction
            const audioPath = videoPath.replace('.mp4', '.mp3');
            const fs = await import('fs');
            const { createRequire } = await import('module');
            const require = createRequire(import.meta.url);
            const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
            const ffprobePath = ffmpegInstaller.path.replace('ffmpeg', 'ffprobe');
            const { execFile } = await import('child_process');
            const { promisify } = await import('util');
            const execFileAsync = promisify(execFile);

            let hasAudio = false;
            try {
                const { stdout } = await execFileAsync(ffprobePath, [
                    '-v', 'error', '-select_streams', 'a:0',
                    '-show_entries', 'stream=codec_type',
                    '-of', 'default=noprint_wrappers=1:nokey=1',
                    videoPath
                ]);
                hasAudio = stdout.trim() === 'audio';
            } catch (_) {
                hasAudio = false;
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

        // 5. Generate summary
        console.log(`[VIDEO-AI] [${videoId}] 🤖 [5/6] Generating AI summary with Gemini...`);
        console.log(`[VIDEO-AI] [${videoId}] ⏰ ${timestamp()}`);
        if (updateStage) await updateStage(videoId, 'generating_summary');

        const summaryStart = Date.now();
        const summary = await generateSummary(srtContent, content.title);
        const summaryDuration = ((Date.now() - summaryStart) / 1000).toFixed(2);
        console.log(`[VIDEO-AI] [${videoId}] ✅ Summary generated in ${summaryDuration}s`);
        console.log(`[VIDEO-AI] [${videoId}]    Summary length: ${summary.length} characters\n`);

        // 6. Generate FAQs and prepare embeddings data
        console.log(`[VIDEO-AI] [${videoId}] ❓ [6/7] Generating FAQs with Gemini...`);
        console.log(`[VIDEO-AI] [${videoId}] ⏰ ${timestamp()}`);
        if (updateStage) await updateStage(videoId, 'generating_faqs');

        const faqStart = Date.now();
        const faqs = await generateFAQs(parsedSrt, content.title, summary, videoId, updateStage);
        const faqDuration = ((Date.now() - faqStart) / 1000).toFixed(2);
        console.log(`[VIDEO-AI] [${videoId}] ✅ All FAQs generated in ${faqDuration}s\n`);

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
    generateSummary,
    generateFAQs
};
