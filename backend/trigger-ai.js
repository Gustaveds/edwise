import jwt from 'jsonwebtoken';
import axios from 'axios';
import db from './db.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

async function triggerAI() {
    try {
        // 1. Get Professor User
        const userRes = await db.query("SELECT * FROM users WHERE email = 'professor@edwise.ai'");
        if (userRes.rows.length === 0) {
            console.error('Professor user not found');
            process.exit(1);
        }
        const user = userRes.rows[0];

        // 2. Generate Token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        console.log('🔑 Token generated');

        // 3. Get a Video
        const videoRes = await db.query("SELECT * FROM videos LIMIT 1");
        if (videoRes.rows.length === 0) {
            console.error('No videos found');
            process.exit(1);
        }
        const video = videoRes.rows[0];
        console.log(`🎬 Found video: ${video.id} (${video.filename})`);

        // 4. Call API
        console.log(`🚀 Triggering AI processing for video ${video.id}...`);
        try {
            const response = await axios.post(
                `http://localhost:3001/api/videos/${video.id}/process-ai`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('✅ API Response:', response.data);
        } catch (apiErr) {
            console.error('❌ API Error:', apiErr.response ? apiErr.response.data : apiErr.message);
        }

    } catch (err) {
        console.error('❌ Script Error:', err);
    } finally {
        process.exit();
    }
}

triggerAI();
