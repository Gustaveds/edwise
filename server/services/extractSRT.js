import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import s3Client from './minio.js';

const execAsync = promisify(exec);

const BUCKET_NAME = 'edwise';

/**
 * Extract SRT subtitles from a video file using ffmpeg
 * First tries to extract embedded subtitles, if not available uses ffmpeg to generate
 * @param {string} videoPath - Local path to video file
 * @returns {Promise<string>} - SRT content as string
 */
async function extractSRTFromFile(videoPath) {
    const outputPath = videoPath.replace(path.extname(videoPath), '.srt');

    try {
        // Try to extract embedded subtitles first
        await execAsync(`ffmpeg -i "${videoPath}" -map 0:s:0 "${outputPath}" -y`);

        if (fs.existsSync(outputPath)) {
            const srtContent = fs.readFileSync(outputPath, 'utf-8');
            fs.unlinkSync(outputPath); // Cleanup
            return srtContent;
        }
    } catch (error) {
        console.log('No embedded subtitles found, will need transcription');
    }

    return null;
}

/**
 * Download video from S3 to temporary location
 * @param {string} s3Key - S3 key of the video
 * @returns {Promise<string>} - Local path to downloaded file
 */
async function downloadVideoFromS3(s3Key) {
    const tempPath = path.join('/tmp', path.basename(s3Key));

    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key
        });

        const response = await s3Client.send(command);
        const writeStream = fs.createWriteStream(tempPath);

        await new Promise((resolve, reject) => {
            response.Body.pipe(writeStream);
            response.Body.on('error', reject);
            writeStream.on('finish', resolve);
        });

        return tempPath;
    } catch (error) {
        console.error('Error downloading video from S3:', error);
        throw error;
    }
}

/**
 * Extract audio from video for transcription
 * @param {string} videoPath - Local path to video file
 * @returns {Promise<string>} - Path to extracted audio file
 */
async function extractAudio(videoPath) {
    const audioPath = videoPath.replace(path.extname(videoPath), '.mp3');

    try {
        await execAsync(`ffmpeg -i "${videoPath}" -vn -acodec libmp3lame -q:a 2 "${audioPath}" -y`);
        return audioPath;
    } catch (error) {
        console.error('Error extracting audio:', error);
        throw error;
    }
}

/**
 * Parse SRT content into structured format by minute
 * @param {string} srtText - Raw SRT text
 * @returns {Object} - Parsed SRT grouped by minute
 */
function parseSRT(srtText) {
    const regex = /(\d+)\s+(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})\s+([\s\S]*?)(?=\s+\d+\s+\d{2}:\d{2}:\d{2},\d{3}|\s*$)/g;
    let groupedByMinute = {};

    let match;
    while ((match = regex.exec(srtText)) !== null) {
        let index = match[1]; // Subtitle index
        let startHour = parseInt(match[2], 10);
        let startMinute = parseInt(match[3], 10);
        let startSecond = parseInt(match[4], 10);
        let startMs = parseInt(match[5], 10);
        let endTime = `${match[6]}:${match[7]}:${match[8]},${match[9]}`;
        let text = match[10].replace(/\s+/g, ' ').trim(); // Normalize text spacing

        let totalMinutes = startHour * 60 + startMinute; // Convert HH:MM to integer minute

        if (!groupedByMinute[totalMinutes]) {
            groupedByMinute[totalMinutes] = [];
        }

        groupedByMinute[totalMinutes].push({
            time: `${match[2]}:${match[3]}:${match[4]},${match[5]} --> ${endTime}`,
            text: text,
            timestamp: `${startHour}h${startMinute}m${startSecond}s`
        });
    }

    return groupedByMinute;
}

/**
 * Cleanup temporary files
 * @param {string[]} paths - Array of file paths to delete
 */
function cleanupFiles(paths) {
    paths.forEach(filePath => {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });
}

/**
 * Transcribe audio using Whisper (local, free, open-source)
 * Used as fallback when video doesn't have embedded SRT
 */
async function transcribeWithWhisper(audioPath) {
    const transcribeStart = Date.now();

    try {
        // Check file size
        const stats = fs.statSync(audioPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log(`🎧 Audio file: ${path.basename(audioPath)} (${fileSizeMB}MB)`);
        console.log('🤖 Using Whisper AI for transcription...');
        console.log('   Model: medium (best quality/speed balance)');
        console.log('   Language: Portuguese');
        console.log('   ⏳ This may take several minutes depending on audio length...\n');

        const execPromise = promisify(exec);

        // Use Python Whisper directly (most reliable)
        const outputPath = audioPath.replace('.mp3', '.srt');
        const outputDir = path.dirname(audioPath);

        try {
            console.log('🔄 Running Whisper transcription...');

            // Run Whisper via Python
            const { stdout, stderr } = await execPromise(
                `python3 -c "import whisper; model = whisper.load_model('medium'); result = model.transcribe('${audioPath}', language='pt'); import json; print(json.dumps(result['segments']))"`
            );

            // Parse Whisper output and convert to SRT
            const segments = JSON.parse(stdout);
            let srtContent = '';

            segments.forEach((segment, index) => {
                const startTime = formatSRTTime(segment.start);
                const endTime = formatSRTTime(segment.end);
                srtContent += `${index + 1}\n${startTime} --> ${endTime}\n${segment.text.trim()}\n\n`;
            });

            const duration = ((Date.now() - transcribeStart) / 1000).toFixed(2);
            const charCount = srtContent.length;
            const wordCount = srtContent.split(/\s+/).length;

            console.log(`✅ Whisper transcription SUCCESS!`);
            console.log(`   ⏱️  Time: ${duration}s`);
            console.log(`   📝 Output: ${charCount} characters, ~${wordCount} words`);
            console.log(`   🎯 Segments: ${segments.length}\n`);

            return srtContent;

        } catch (whisperError) {
            // Check if it's a model download issue
            if (whisperError.message.includes('FileNotFoundError') ||
                whisperError.message.includes('medium.pt')) {
                console.log('📥 Model not found locally. Whisper is downloading model (~1.4GB)...');
                console.log('   This is a one-time download. Please wait...');
                throw new Error(
                    'Whisper model downloading. This is automatic but takes time (~5-10 min).\n' +
                    'The model will be cached for future use.'
                );
            }

            throw whisperError;
        }

    } catch (error) {
        const duration = ((Date.now() - transcribeStart) / 1000).toFixed(2);

        console.error(`❌ Whisper transcription FAILED after ${duration}s`);
        console.error(`   Error: ${error.message}`);

        // Check if Whisper is installed
        if (error.message.includes('import whisper') ||
            error.message.includes('ModuleNotFoundError')) {
            console.log('\n⚠️  Whisper Python module NOT INSTALLED');
            console.log('   Install with: pip3 install openai-whisper');
            throw new Error(
                'Whisper not found. Please install:\n' +
                '  pip3 install openai-whisper\n' +
                'Or for faster performance:\n' +
                '  pip install faster-whisper'
            );
        }

        throw error;
    }
}

/**
 * Format seconds to SRT time format (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millis = 0;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export {
    extractSRTFromFile,
    downloadVideoFromS3,
    extractAudio,
    parseSRT,
    cleanupFiles,
    transcribeWithWhisper
};
