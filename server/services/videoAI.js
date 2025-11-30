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
async function generateFAQs(parsedSrt, title, summary) {
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

        for (let i = 0; i < minutes.length; i += 3) {
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
                const result = await model.generateContent(prompt);
                const responseText = result.response.text();

                // Parse JSON response
                const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                const faqs = JSON.parse(cleanText);
                if (Array.isArray(faqs)) {
                    allFaqs.push(...faqs);
                }
            } catch (error) {
                console.error(`Error generating FAQs for batch ${i}:`, error);
                // Continue to next batch
            }
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
 * @returns {Promise<Object>} - Processing results
 */
async function processVideoWithAI(videoId) {
    let tempFiles = [];
    const processingStartTime = Date.now();

    try {
        console.log(`\n${'▶'.repeat(40)}`);
        console.log(`🎥 STARTING AI PROCESSING FOR VIDEO ID: ${videoId}`);
        console.log(`${'▶'.repeat(40)}\n`);

        // 1. Get video info from database
        console.log('📋 [1/6] Fetching video metadata from database...');
        const videoResult = await db.query('SELECT * FROM videos WHERE id = $1', [videoId]);
        if (videoResult.rows.length === 0) {
            throw new Error('Video not found');
        }

        const video = videoResult.rows[0];
        const contentResult = await db.query('SELECT * FROM contents WHERE id = $1', [video.content_id]);
        const content = contentResult.rows[0];
        console.log(`✅ Video metadata loaded: "${content.title}"`);
        console.log(`   S3 Key: ${video.s3_key}\n`);

        // 2. Download video from S3
        console.log('📥 [2/6] Downloading video from S3...');
        const downloadStart = Date.now();
        const videoPath = await downloadVideoFromS3(video.s3_key);
        const downloadDuration = ((Date.now() - downloadStart) / 1000).toFixed(2);
        tempFiles.push(videoPath);
        console.log(`✅ Video downloaded in ${downloadDuration}s`);
        console.log(`   Path: ${videoPath}\n`);

        // 3. Extract SRT
        console.log('🎙️  [3/6] Extracting subtitles/transcription...');
        const srtStart = Date.now();
        let srtContent = await extractSRTFromFile(videoPath);

        // If no SRT, use Whisper for transcription (local, free)
        if (!srtContent) {
            console.log('⚠️  No embedded SRT found in video file');
            console.log('🎤 Using Whisper for audio transcription (this may take several minutes)...');

            // Extract audio first
            const audioPath = videoPath.replace('.mp4', '.mp3');
            console.log('🔊 Extracting audio from video...');
            const fs = await import('fs');
            const { createRequire } = await import('module');
            const require = createRequire(import.meta.url);
            await new Promise((resolve, reject) => {
                const ffmpeg = require('fluent-ffmpeg');
                const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
                ffmpeg.setFfmpegPath(ffmpegInstaller.path);
                ffmpeg(videoPath)
                    .output(audioPath)
                    .audioCodec('libmp3lame')
                    .on('end', () => {
                        const stats = fs.statSync(audioPath);
                        const audioSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
                        console.log(`✅ Audio extracted: ${audioSizeMB}MB`);
                        resolve();
                    })
                    .on('error', reject)
                    .run();
            });

            tempFiles.push(audioPath);

            // Transcribe with Whisper (local)
            console.log('🧠 Starting Whisper transcription (model: medium)...');
            const whisperStart = Date.now();
            const { transcribeWithWhisper } = await import('./extractSRT.js');
            srtContent = await transcribeWithWhisper(audioPath);
            const whisperDuration = ((Date.now() - whisperStart) / 1000).toFixed(2);

            console.log(`✅ Whisper transcription completed in ${whisperDuration}s`);
            console.log(`   Transcript length: ${srtContent.length} characters\n`);
        } else {
            const srtDuration = ((Date.now() - srtStart) / 1000).toFixed(2);
            console.log(`✅ SRT subtitles extracted in ${srtDuration}s`);
            console.log(`   Transcript length: ${srtContent.length} characters\n`);
        }

        // 4. Parse SRT
        console.log('📝 [4/6] Parsing transcript into structured format...');
        const parsedSrt = parseSRT(srtContent);
        const minuteCount = Object.keys(parsedSrt).length;
        console.log(`✅ Transcript parsed: ${minuteCount} minutes of content\n`);

        // 5. Generate summary
        console.log('🤖 [5/6] Generating AI summary with Gemini...');
        const summaryStart = Date.now();
        const summary = await generateSummary(srtContent, content.title);
        const summaryDuration = ((Date.now() - summaryStart) / 1000).toFixed(2);
        console.log(`✅ Summary generated in ${summaryDuration}s`);
        console.log(`   Summary length: ${summary.length} characters\n`);

        // 6. Generate FAQs and prepare embeddings data
        console.log('❓ [6/6] Generating FAQs with Gemini...');
        const faqStart = Date.now();
        const faqs = await generateFAQs(parsedSrt, content.title, summary);
        const faqDuration = ((Date.now() - faqStart) / 1000).toFixed(2);
        console.log(`✅ ${faqs.length} FAQs generated in ${faqDuration}s\n`);

        // 7. Generate and store embeddings in documents table
        console.log('🧠 [7/7] Generating and storing embeddings...');
        const embeddingStart = Date.now();
        const contentId = video.content_id;

        // Get video URL from content metadata
        const videoUrl = content.data?.s3_key ?
            `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET}/${content.data.s3_key}` :
            '';

        let embeddingCount = 0;
        for (const faq of faqs) {
            const docContent = `${faq.pergunta} tempo: ${faq.tempo}`;
            const metadata = {
                video_url: videoUrl,
                video_id: videoId,
                content_id: contentId,
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

            embeddingCount++;
            if (embeddingCount % 10 === 0) {
                console.log(`   📊 Progress: ${embeddingCount}/${faqs.length} embeddings stored...`);
            }
        }

        const embeddingDuration = ((Date.now() - embeddingStart) / 1000).toFixed(2);
        console.log(`✅ All ${faqs.length} FAQ embeddings stored in ${embeddingDuration}s\n`);

        // 8. Update videos table
        console.log('💾 Updating database with processed data...');
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
        console.log('✅ Database updated with AI-generated content\n');

        // 9. Cleanup temp files
        console.log('🧹 Cleaning up temporary files...');
        cleanupFiles(tempFiles);
        console.log('✅ Temporary files cleaned\n');

        const totalDuration = ((Date.now() - processingStartTime) / 1000).toFixed(2);
        console.log(`${'▶'.repeat(40)}`);
        console.log(`✅ VIDEO PROCESSING COMPLETED SUCCESSFULLY`);
        console.log(`   Total Duration: ${totalDuration}s`);
        console.log(`   Summary: ${summary.substring(0, 80)}...`);
        console.log(`   FAQs: ${faqs.length} questions`);
        console.log(`   Embeddings: ${faqs.length} stored`);
        console.log(`${'▶'.repeat(40)}\n`);

        return {
            success: true,
            summary,
            faqCount: faqs.length,
            message: 'Video processed successfully with AI'
        };

    } catch (error) {
        console.error('Error processing video with AI:', error);

        // Cleanup temp files on error
        cleanupFiles(tempFiles);

        // Update video status to error
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
