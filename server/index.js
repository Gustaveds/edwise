import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, './.env') });
dotenv.config();

import express from 'express';
import cors from 'cors';
import db from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateResponse } from './services/geminiAgent.js';
import { generateQuizWithRag, generateFlashcardsWithRag } from './services/ragAI.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import s3Client from './services/minio.js';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateBucketCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import { videoQueue, VIDEO_JOB_OPTIONS } from './services/queue.js';

const app = express();
const upload = multer({ dest: 'uploads/' }); // Temp storage
const BUCKET_NAME = 'edwise';
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(cors());
app.use(express.json());

// Root & Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'EdWise AI Backend API is running', port: PORT });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Helper function to sanitize titles
function sanitizeTitle(title) {
    if (!title) return title;
    // Remove or replace problematic characters, keep basic punctuation
    return title
        .replace(/[<>]/g, '') // Remove < >
        .replace(/[{}[\]]/g, '') // Remove brackets
        .replace(/\\/g, '') // Remove backslashes
        .replace(/\|/g, '-') // Replace pipes with dashes
        .trim();
}

// Middleware to authenticate token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// --- Auth Routes ---

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', { email, passwordProvided: !!password });

    try {
        await db.query('SELECT NOW()');
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        console.log('👤 User found:', { id: user.id, email: user.email, role: user.role });

        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log('🔑 Password match:', isValid);

        if (!isValid) {
            console.log('❌ Invalid password for:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('✅ Login successful for:', email);
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error('💥 Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Course Routes ---

app.get('/api/courses', authenticateToken, async (req, res) => {
    try {
        const baseWithCount = `
            SELECT c.*, COALESCE(e.cnt, 0)::int AS student_count
            FROM courses c
            LEFT JOIN (
                SELECT course_id, COUNT(*) AS cnt
                FROM enrollments GROUP BY course_id
            ) e ON e.course_id = c.id
        `;
        let query = baseWithCount;
        let params = [];

        if (req.user.role === 'professor') {
            query = `${baseWithCount} WHERE c.professor_id = $1`;
            params.push(req.user.id);
        } else if (req.user.role === 'student') {
            // Show enrolled courses
            query = `
                SELECT c.* FROM courses c
                JOIN enrollments e ON c.id = e.course_id
                WHERE e.student_id = $1
            `;
            params.push(req.user.id);
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch courses' });
    }
});

app.post('/api/courses', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);

    const { title, description, organization_type } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO courses (title, description, professor_id, organization_type) VALUES ($1, $2, $3, $4) RETURNING *',
            [title, description, req.user.id, organization_type]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create course' });
    }
});

app.put('/api/courses/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);

    const courseId = req.params.id;
    const { title, description, organization_type } = req.body;

    try {
        const result = await db.query(
            'UPDATE courses SET title = $1, description = $2, organization_type = $3 WHERE id = $4 RETURNING *',
            [title, description, organization_type, courseId]
        );

        if (result.rows.length === 0) return res.status(404).json({ error: 'Course not found' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update course' });
    }
});

app.delete('/api/courses/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);
    const courseId = req.params.id;

    try {
        // 1. Get all modules of the course
        const modulesRes = await db.query('SELECT id FROM modules WHERE course_id = $1', [courseId]);
        const modules = modulesRes.rows;

        // 2. For each module, delete its contents (cascade)
        for (const module of modules) {
            const contentsRes = await db.query('SELECT * FROM contents WHERE module_id = $1', [module.id]);
            const contents = contentsRes.rows;

            for (const content of contents) {
                if (content.type === 'VIDEO' || content.type === 'video') {
                    const videoRes = await db.query('SELECT id, s3_key FROM videos WHERE content_id = $1', [content.id]);
                    if (videoRes.rows.length > 0) {
                        const video = videoRes.rows[0];

                        // Delete AI embeddings
                        await db.query("DELETE FROM documents WHERE metadata->>'video_id' = $1", [video.id.toString()]);

                        // Delete video segments
                        await db.query('DELETE FROM video_segments WHERE video_id = $1', [video.id]);

                        // Delete video record
                        await db.query('DELETE FROM videos WHERE id = $1', [video.id]);

                        // Delete from S3
                        if (video.s3_key) {
                            try {
                                await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: video.s3_key }));
                                console.log(`✓ Deleted S3 file: ${video.s3_key}`);
                            } catch (s3Err) {
                                console.error(`⚠ Failed to delete S3 file: ${video.s3_key}`, s3Err);
                            }
                        }
                    }
                }
                // Delete content record
                await db.query('DELETE FROM contents WHERE id = $1', [content.id]);
            }
            // Delete module record
            await db.query('DELETE FROM modules WHERE id = $1', [module.id]);
        }

        // 3. Delete the course itself
        await db.query('DELETE FROM courses WHERE id = $1', [courseId]);

        res.json({ success: true, message: 'Course and all related data deleted successfully' });

    } catch (err) {
        console.error('Error deleting course:', err);
        res.status(500).json({ error: 'Failed to delete course' });
    }
});

app.get('/api/courses/:id', authenticateToken, async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);

        if (course.rows.length === 0) return res.status(404).json({ error: 'Course not found' });

        // Fetch modules and contents
        const modules = await db.query('SELECT DISTINCT * FROM modules WHERE course_id = $1 ORDER BY order_index', [courseId]);
        const contents = await db.query(`
            SELECT DISTINCT ON (c.id)
                c.id, c.module_id, c.title, c.type, c.description, c.data,
                c.order_index, c.is_published, c.created_at, c.settings,
                v.id as video_id, v.status as video_status
            FROM contents c
            LEFT JOIN videos v ON c.id = v.content_id
            JOIN modules m ON c.module_id = m.id
            WHERE m.course_id = $1
            ORDER BY c.id, c.order_index
        `, [courseId]);

        // Organize into tree structure - garantir unicidade
        const modulesMap = Array.from(
            new Map(modules.rows.map(m => [m.id, { ...m, contents: [], subModules: [] }])).values()
        );

        // Garantir unicidade dos contents também e incluir status de processamento
        const contentMap = Array.from(
            new Map(contents.rows.map(c => {
                // Add video_status to settings if it's a video
                const contentWithStatus = { ...c };
                if (c.video_id && c.video_status) {
                    contentWithStatus.settings = {
                        ...(c.settings || {}),
                        status: c.video_status
                    };
                }
                return [c.id, contentWithStatus];
            })).values()
        );

        // Attach contents to modules
        contentMap.forEach(c => {
            const module = modulesMap.find(m => m.id === c.module_id);
            if (module) module.contents.push(c);
        });

        // Handle nested modules (if we implement nesting later, for now flat list of modules is fine or simple hierarchy)
        // The plan mentioned nesting, let's just return the flat list with parent_id for frontend to handle or simple structure
        // For simplicity in this iteration: return course + modules (with their contents)

        res.json({
            ...course.rows[0],
            modules: modulesMap
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch course details' });
    }
});

// --- Enrollment Routes ---

async function assertCourseManager(req, res, courseId) {
    if (req.user.role === 'admin') return true;
    if (req.user.role !== 'professor') {
        res.sendStatus(403);
        return false;
    }
    const owned = await db.query(
        'SELECT 1 FROM courses WHERE id = $1 AND professor_id = $2',
        [courseId, req.user.id]
    );
    if (owned.rows.length === 0) {
        res.sendStatus(403);
        return false;
    }
    return true;
}

app.get('/api/courses/:id/students', authenticateToken, async (req, res) => {
    const courseId = req.params.id;
    if (!await assertCourseManager(req, res, courseId)) return;

    try {
        const result = await db.query(`
            SELECT u.id, u.name, u.email, e.enrolled_at
            FROM enrollments e
            JOIN users u ON u.id = e.student_id
            WHERE e.course_id = $1
            ORDER BY e.enrolled_at DESC
        `, [courseId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing enrolled students:', err);
        res.status(500).json({ error: 'Failed to list enrolled students' });
    }
});

app.get('/api/students/search', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);
    const q = (req.query.q || '').toString().trim();
    const courseId = req.query.courseId;

    try {
        const params = [`%${q}%`];
        let sql = `
            SELECT id, name, email FROM users
            WHERE role = 'student' AND (email ILIKE $1 OR name ILIKE $1)
        `;
        if (courseId) {
            params.push(courseId);
            sql += ` AND id NOT IN (SELECT student_id FROM enrollments WHERE course_id = $${params.length})`;
        }
        sql += ' ORDER BY email LIMIT 10';
        const result = await db.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error searching students:', err);
        res.status(500).json({ error: 'Failed to search students' });
    }
});

app.post('/api/courses/:id/students', authenticateToken, async (req, res) => {
    const courseId = req.params.id;
    if (!await assertCourseManager(req, res, courseId)) return;

    const { email, studentId } = req.body;
    if (!email && !studentId) {
        return res.status(400).json({ error: 'email or studentId required' });
    }

    try {
        const userQuery = studentId
            ? await db.query("SELECT id, name, email FROM users WHERE id = $1 AND role = 'student'", [studentId])
            : await db.query("SELECT id, name, email FROM users WHERE email = $1 AND role = 'student'", [email]);

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        const student = userQuery.rows[0];

        const enroll = await db.query(`
            INSERT INTO enrollments (student_id, course_id)
            VALUES ($1, $2)
            ON CONFLICT (student_id, course_id) DO NOTHING
            RETURNING enrolled_at
        `, [student.id, courseId]);

        if (enroll.rows.length === 0) {
            return res.status(409).json({ error: 'Student already enrolled' });
        }

        res.json({ ...student, enrolled_at: enroll.rows[0].enrolled_at });
    } catch (err) {
        console.error('Error enrolling student:', err);
        res.status(500).json({ error: 'Failed to enroll student' });
    }
});

app.delete('/api/courses/:id/students/:studentId', authenticateToken, async (req, res) => {
    const { id: courseId, studentId } = req.params;
    if (!await assertCourseManager(req, res, courseId)) return;

    try {
        const result = await db.query(
            'DELETE FROM enrollments WHERE course_id = $1 AND student_id = $2 RETURNING id',
            [courseId, studentId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error unenrolling student:', err);
        res.status(500).json({ error: 'Failed to unenroll student' });
    }
});

// --- Module Routes ---

app.post('/api/modules', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);
    const { course_id, title, parent_id, type } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO modules (course_id, title, parent_id, type) VALUES ($1, $2, $3, $4) RETURNING *',
            [course_id, title, parent_id, type]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create module' });
    }
});

app.put('/api/modules/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);
    const moduleId = req.params.id;
    const { title, type } = req.body;
    try {
        const result = await db.query(
            'UPDATE modules SET title = $1, type = $2 WHERE id = $3 RETURNING *',
            [title, type, moduleId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Module not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update module' });
    }
});

app.delete('/api/modules/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);
    const moduleId = req.params.id;

    try {
        // 1. Get all contents of the module
        const contentsRes = await db.query('SELECT * FROM contents WHERE module_id = $1', [moduleId]);
        const contents = contentsRes.rows;

        // 2. Delete each content (reusing logic would be best, but for now let's duplicate the critical cleanup logic to be safe)
        for (const content of contents) {
            if (content.type === 'VIDEO' || content.type === 'video') {
                const videoRes = await db.query('SELECT id, s3_key FROM videos WHERE content_id = $1', [content.id]);
                if (videoRes.rows.length > 0) {
                    const video = videoRes.rows[0];

                    // Delete AI embeddings
                    await db.query("DELETE FROM documents WHERE metadata->>'video_id' = $1", [video.id.toString()]);

                    // Delete video segments
                    await db.query('DELETE FROM video_segments WHERE video_id = $1', [video.id]);

                    // Delete video record
                    await db.query('DELETE FROM videos WHERE id = $1', [video.id]);

                    // Delete from S3
                    if (video.s3_key) {
                        try {
                            await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: video.s3_key }));
                            console.log(`✓ Deleted S3 file: ${video.s3_key}`);
                        } catch (s3Err) {
                            console.error(`⚠ Failed to delete S3 file: ${video.s3_key}`, s3Err);
                        }
                    }
                }
            }
            // Delete content record
            await db.query('DELETE FROM contents WHERE id = $1', [content.id]);
        }

        // 3. Delete the module itself
        await db.query('DELETE FROM modules WHERE id = $1', [moduleId]);

        res.json({ success: true, message: 'Module and all contents deleted successfully' });

    } catch (err) {
        console.error('Error deleting module:', err);
        res.status(500).json({ error: 'Failed to delete module' });
    }
});

// Helper to sanitize content payload for Postgres
function sanitizeContentPayload(body) {
    let { module_id, title, type, data, description, settings, is_published, release_at, release_after_days } = body;

    title = sanitizeTitle(title || 'Sem título');

    // Normalize type to lowercase and map to allowed database types
    let normType = (type || 'text').toString().toLowerCase();
    if (normType === 'file') normType = 'pdf';
    if (normType === 'assignment') normType = 'text';

    const validTypes = ['pdf', 'video', 'text', 'link', 'word', 'quiz'];
    if (!validTypes.includes(normType)) {
        normType = 'text';
    }

    // Sanitize data for JSONB column
    let cleanData = {};
    if (data && typeof data === 'object') {
        cleanData = data;
    } else if (typeof data === 'string' && data.trim() !== '') {
        try {
            cleanData = JSON.parse(data);
        } catch {
            cleanData = { text: data };
        }
    }

    let cleanSettings = {};
    if (settings && typeof settings === 'object') {
        cleanSettings = settings;
    } else if (typeof settings === 'string' && settings.trim() !== '') {
        try {
            cleanSettings = JSON.parse(settings);
        } catch {
            cleanSettings = {};
        }
    }

    return {
        module_id,
        title,
        type: normType,
        data: cleanData,
        description: description || '',
        settings: cleanSettings,
        is_published: !!is_published,
        release_at: release_at || null,
        release_after_days: release_after_days || null
    };
}

// --- Content Routes ---

app.post('/api/contents', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);
    const sanitized = sanitizeContentPayload(req.body);
    try {
        const result = await db.query(
            'INSERT INTO contents (module_id, title, type, data, description, settings, is_published, release_at, release_after_days) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [sanitized.module_id, sanitized.title, sanitized.type, sanitized.data, sanitized.description, sanitized.settings, sanitized.is_published, sanitized.release_at, sanitized.release_after_days]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating content:', err);
        res.status(500).json({ error: 'Failed to create content' });
    }
});

app.put('/api/contents/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);
    const contentId = req.params.id;
    const sanitized = sanitizeContentPayload(req.body);
    try {
        const result = await db.query(
            'UPDATE contents SET title = $1, type = $2, data = $3, description = $4, settings = $5, is_published = $6, release_at = $7, release_after_days = $8 WHERE id = $9 RETURNING *',
            [sanitized.title, sanitized.type, sanitized.data, sanitized.description, sanitized.settings, sanitized.is_published, sanitized.release_at, sanitized.release_after_days, contentId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Content not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating content:', err);
        res.status(500).json({ error: 'Failed to update content' });
    }
});


app.post('/api/quizzes', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);
    const { content_id, title, passing_score, questions } = req.body;

    try {
        await db.query('BEGIN');

        const quizResult = await db.query(
            'INSERT INTO quizzes (content_id, title, passing_score) VALUES ($1, $2, $3) RETURNING id',
            [content_id, title, passing_score]
        );
        const quizId = quizResult.rows[0].id;

        for (const [index, q] of questions.entries()) {
            await db.query(
                'INSERT INTO quiz_questions (quiz_id, question_text, question_type, options, order_index) VALUES ($1, $2, $3, $4, $5)',
                [quizId, q.question_text, q.question_type, JSON.stringify(q.options), index]
            );
        }

        await db.query('COMMIT');
        res.json({ id: quizId, message: 'Quiz created successfully' });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to create quiz' });
    }
});

app.post('/api/assignments', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);
    const { content_id, max_score, due_date, instructions } = req.body;

    try {
        const result = await db.query(
            'INSERT INTO assignments (content_id, max_score, due_date, instructions) VALUES ($1, $2, $3, $4) RETURNING *',
            [content_id, max_score, due_date, instructions]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create assignment' });
    }
});

// --- Flashcards Routes ---

// Save a flashcard
app.post('/api/flashcards', authenticateToken, async (req, res) => {
    const { course_id, question, answer, source } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO saved_flashcards (user_id, course_id, question, answer, source) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, course_id, question, answer, source]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error saving flashcard:', err);
        res.status(500).json({ error: 'Failed to save flashcard' });
    }
});

// Get all flashcards for a course, grouped into sets
//
// saved_flashcards stores one row per card (question/answer/source), but the
// frontend (FlashcardsModal) expects "sets" of the shape
// { id, title, cards: [{question, answer}], created_at }. Grouping by
// `source` alone isn't reliable: the chat command defaults the topic to
// "General" whenever none is typed, so unrelated generation sessions can
// share the exact same source text. Instead we group by time proximity —
// all cards from one /api/ai/generate-flashcards call are inserted within
// milliseconds of each other, while separate sessions are realistically
// seconds/minutes/days apart — starting a new set whenever the gap since
// the previous card exceeds 30 seconds.
app.get('/api/flashcards', authenticateToken, async (req, res) => {
    const { course_id } = req.query;
    try {
        const result = await db.query(
            `WITH ordered AS (
                SELECT *,
                    created_at - LAG(created_at) OVER (ORDER BY created_at) AS gap
                FROM saved_flashcards
                WHERE user_id = $1 AND course_id = $2
             ),
             grouped AS (
                SELECT *,
                    SUM(CASE WHEN gap IS NULL OR gap > INTERVAL '30 seconds' THEN 1 ELSE 0 END)
                        OVER (ORDER BY created_at) AS set_group
                FROM ordered
             )
             SELECT
                MIN(id) AS id,
                MIN(source) AS title,
                json_agg(json_build_object('question', question, 'answer', answer) ORDER BY id) AS cards,
                MIN(created_at) AS created_at
             FROM grouped
             GROUP BY set_group
             ORDER BY MIN(created_at) DESC`,
            [req.user.id, course_id]
        );
        const sets = result.rows.map(row => ({
            id: row.id,
            title: (row.title || 'Flashcards').replace(/^Generated:\s*/i, ''),
            cards: row.cards,
            created_at: row.created_at
        }));
        res.json(sets);
    } catch (err) {
        console.error('Error fetching flashcards:', err);
        res.status(500).json({ error: 'Failed to fetch flashcards' });
    }
});

// Delete an entire flashcard set (:id is the representative row id returned
// by GET /api/flashcards — since sets aren't a stored grouping, we recompute
// the same time-proximity grouping here and delete every row that belongs
// to the same set as :id, not just that one row).
app.delete('/api/flashcards/:id', authenticateToken, async (req, res) => {
    const flashcardId = req.params.id;
    try {
        const cardRow = await db.query(
            'SELECT course_id FROM saved_flashcards WHERE id = $1 AND user_id = $2',
            [flashcardId, req.user.id]
        );
        if (cardRow.rows.length === 0) {
            return res.status(404).json({ error: 'Flashcard not found' });
        }
        const courseId = cardRow.rows[0].course_id;

        const result = await db.query(
            `WITH ordered AS (
                SELECT id, created_at,
                    created_at - LAG(created_at) OVER (ORDER BY created_at) AS gap
                FROM saved_flashcards
                WHERE user_id = $1 AND course_id = $2
             ),
             grouped AS (
                SELECT id,
                    SUM(CASE WHEN gap IS NULL OR gap > INTERVAL '30 seconds' THEN 1 ELSE 0 END)
                        OVER (ORDER BY created_at) AS set_group
                FROM ordered
             ),
             target AS (
                SELECT set_group FROM grouped WHERE id = $3
             )
             DELETE FROM saved_flashcards
             WHERE id IN (SELECT id FROM grouped WHERE set_group = (SELECT set_group FROM target))
             RETURNING id`,
            [req.user.id, courseId, flashcardId]
        );

        res.json({ success: true, message: 'Flashcard set deleted successfully', deletedCount: result.rowCount });
    } catch (err) {
        console.error('Error deleting flashcard set:', err);
        res.status(500).json({ error: 'Failed to delete flashcard set' });
    }
});

// --- Generated Quizzes Routes ---

// Save generated quiz from AI
app.post('/api/generated-quizzes', authenticateToken, async (req, res) => {
    const { course_id, title, questions } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO generated_quizzes (user_id, course_id, title, questions) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, course_id, title, JSON.stringify(questions)]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error saving quiz:', err);
        res.status(500).json({ error: 'Failed to save quiz' });
    }
});

// Get generated quizzes for a course
app.get('/api/generated-quizzes', authenticateToken, async (req, res) => {
    const { course_id } = req.query;
    try {
        const result = await db.query(
            'SELECT * FROM generated_quizzes WHERE user_id = $1 AND course_id = $2 ORDER BY created_at DESC',
            [req.user.id, course_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching quizzes:', err);
        res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
});

// Delete a generated quiz
app.delete('/api/generated-quizzes/:id', authenticateToken, async (req, res) => {
    const quizId = req.params.id;
    try {
        const result = await db.query(
            'DELETE FROM generated_quizzes WHERE id = $1 AND user_id = $2 RETURNING *',
            [quizId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Quiz not found' });
        }
        res.json({ success: true, message: 'Quiz deleted successfully' });
    } catch (err) {
        console.error('Error deleting quiz:', err);
        res.status(500).json({ error: 'Failed to delete quiz' });
    }
});

// --- Notes Routes ---

// Save a note
app.post('/api/notes', authenticateToken, async (req, res) => {
    const { course_id, content, video_id, timestamp } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO notes (user_id, course_id, content, video_id, timestamp) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, course_id, content, video_id, timestamp]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error saving note:', err);
        res.status(500).json({ error: 'Failed to save note' });
    }
});

// Get all notes for a course or video
app.get('/api/notes', authenticateToken, async (req, res) => {
    const { course_id, video_id } = req.query;
    try {
        let query = 'SELECT * FROM notes WHERE user_id = $1';
        const params = [req.user.id];

        if (course_id) {
            query += ' AND course_id = $2';
            params.push(course_id);
        }
        if (video_id) {
            query += params.length > 1 ? ' AND video_id = $3' : ' AND video_id = $2';
            params.push(video_id);
        }

        query += ' ORDER BY created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching notes:', err);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Update a note
app.put('/api/notes/:id', authenticateToken, async (req, res) => {
    const noteId = req.params.id;
    const { content } = req.body;
    try {
        const result = await db.query(
            'UPDATE notes SET content = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
            [content, noteId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating note:', err);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// Delete a note
app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
    const noteId = req.params.id;
    try {
        const result = await db.query(
            'DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *',
            [noteId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Note not found' });
        }
        res.json({ success: true, message: 'Note deleted successfully' });
    } catch (err) {
        console.error('Error deleting note:', err);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// --- Chat History Routes ---

// Save chat message
app.post('/api/chat-history', authenticateToken, async (req, res) => {
    const { course_id, message, response, video_id } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO chat_history (user_id, course_id, message, response, video_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.user.id, course_id, message, response, video_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error saving chat history:', err);
        res.status(500).json({ error: 'Failed to save chat history' });
    }
});

// Get chat history for a course
app.get('/api/chat-history', authenticateToken, async (req, res) => {
    const { course_id, video_id } = req.query;
    try {
        let query = 'SELECT * FROM chat_history WHERE user_id = $1';
        const params = [req.user.id];

        if (course_id) {
            query += ' AND course_id = $2';
            params.push(course_id);
        }
        if (video_id) {
            query += params.length > 1 ? ' AND video_id = $3' : ' AND video_id = $2';
            params.push(video_id);
        }

        query += ' ORDER BY created_at ASC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching chat history:', err);
        res.status(500).json({ error: 'Failed to fetch chat history' });
    }
});

// Delete chat history
app.delete('/api/chat-history/:id', authenticateToken, async (req, res) => {
    const chatId = req.params.id;
    try {
        const result = await db.query(
            'DELETE FROM chat_history WHERE id = $1 AND user_id = $2 RETURNING *',
            [chatId, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chat message not found' });
        }
        res.json({ success: true, message: 'Chat message deleted successfully' });
    } catch (err) {
        console.error('Error deleting chat history:', err);
        res.status(500).json({ error: 'Failed to delete chat history' });
    }
});

// --- Video Upload Route ---

app.post('/api/upload/video', authenticateToken, upload.single('video'), async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);

    const file = req.file;
    let { title, description, module_id } = req.body;

    // Sanitize title
    title = sanitizeTitle(title);

    if (!file) {
        return res.status(400).json({ error: 'No video file provided' });
    }

    const fileKey = `videos/${uuidv4()}-${file.originalname}`;
    const fileStream = fs.createReadStream(file.path);

    try {
        // 1. Upload to MinIO
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: fileKey,
            Body: fileStream,
            ContentType: file.mimetype,
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // 2. Create Content Record
        const contentResult = await db.query(
            'INSERT INTO contents (module_id, title, type, description, data, is_published) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [module_id, title, 'video', description, { s3_key: fileKey, filename: file.originalname }, false]
        );
        const contentId = contentResult.rows[0].id;

        // 3. Create Video Record
        const videoResult = await db.query(
            'INSERT INTO videos (content_id, filename, s3_key, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [contentId, file.originalname, fileKey, 'processing']
        );

        // 4. Cleanup temp file
        fs.unlinkSync(file.path);

        // 5. Add to Processing Queue
        await videoQueue.add('process-video', {
            videoId: videoResult.rows[0].id,
            s3Key: fileKey,
            filename: file.originalname,
            contentId: contentId
        }, VIDEO_JOB_OPTIONS);

        res.json({
            success: true,
            content_id: contentId,
            video_id: videoResult.rows[0].id,
            message: 'Video uploaded successfully and processing started.'
        });

    } catch (err) {
        console.error('Upload error:', err);
        // Try to cleanup temp file if it exists
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(500).json({ error: 'Failed to upload video' });
    }
});

// --- File / Document Upload Route (PDF, DOCX, TXT, etc.) ---

app.post('/api/upload/file', authenticateToken, upload.single('file'), async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);

    const file = req.file;
    let { title, description, module_id, type } = req.body;

    if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo fornecido' });
    }

    if (!module_id) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'ID do módulo é obrigatório' });
    }

    // Default title from filename if not provided
    if (!title || !title.trim()) {
        title = file.originalname.replace(/\.[^/.]+$/, '');
    }
    title = sanitizeTitle(title);

    // Determine type (database allows 'pdf', 'word', 'text', 'link', 'video', 'quiz')
    let contentType = 'pdf';
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || '').toLowerCase();
    if (ext === '.docx' || ext === '.doc' || mime.includes('word')) {
        contentType = 'word';
    } else if (ext === '.pdf' || mime.includes('pdf')) {
        contentType = 'pdf';
    } else if (type && ['pdf', 'word', 'text'].includes(type.toLowerCase())) {
        contentType = type.toLowerCase();
    }

    const fileKey = `files/${uuidv4()}-${file.originalname}`;
    const fileStream = fs.createReadStream(file.path);

    try {
        // Ensure bucket exists
        try {
            await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        } catch (bErr) {
            // Bucket already exists
        }

        // 1. Upload to MinIO S3
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: fileKey,
            Body: fileStream,
            ContentType: file.mimetype || 'application/octet-stream',
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // 2. Create Content Record
        const contentData = {
            s3_key: fileKey,
            filename: file.originalname,
            size: file.size,
            mimetype: file.mimetype
        };

        const contentResult = await db.query(
            'INSERT INTO contents (module_id, title, type, description, data, is_published) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [module_id, title, contentType, description || '', contentData, true]
        );

        // 3. Cleanup temp file
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

        // 4. Enqueue for RAG indexing (extraction + embeddings), so quizzes/
        // flashcards/chat can ground answers in this material too, not only
        // in video transcripts.
        await videoQueue.add('process-document', {
            contentId: contentResult.rows[0].id
        }, VIDEO_JOB_OPTIONS);

        res.status(202).json({
            success: true,
            content: contentResult.rows[0],
            content_id: contentResult.rows[0].id,
            s3_key: fileKey,
            filename: file.originalname,
            message: 'Arquivo enviado com sucesso. Indexação para IA em andamento.'
        });

    } catch (err) {
        console.error('File upload error:', err);
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(500).json({ error: 'Falha ao enviar arquivo' });
    }
});

// GET - Stream / Download file from S3/MinIO
app.get('/api/contents/:id/file', async (req, res) => {
    const contentId = req.params.id;
    const token = req.headers['authorization']?.split(' ')[1] || req.query.token;

    if (!token) return res.sendStatus(401);

    try {
        jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.sendStatus(403);
    }

    try {
        const result = await db.query('SELECT data, title, type FROM contents WHERE id = $1', [contentId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conteúdo não encontrado' });
        }

        const content = result.rows[0];
        const s3Key = content.data?.s3_key;
        if (!s3Key) {
            return res.status(404).json({ error: 'Arquivo não encontrado' });
        }

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
        });

        const response = await s3Client.send(command);

        const filename = content.data?.filename || `${content.title}.${content.type === 'pdf' ? 'pdf' : 'bin'}`;
        const contentType = response.ContentType || content.data?.mimetype || (content.type === 'pdf' ? 'application/pdf' : 'application/octet-stream');

        res.setHeader('Content-Type', contentType);
        if (response.ContentLength) {
            res.setHeader('Content-Length', response.ContentLength);
        }
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);

        response.Body.pipe(res);

    } catch (err) {
        console.error('Error streaming file:', err);
        res.status(500).json({ error: 'Falha ao obter arquivo' });
    }
});


// --- Video AI Processing Routes ---

app.post('/api/videos/:id/process-ai', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);

    const videoId = req.params.id;

    try {
        // Check if video exists
        const videoCheck = await db.query('SELECT * FROM videos WHERE id = $1', [videoId]);
        if (videoCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const video = videoCheck.rows[0];

        // Check if already processed or in progress
        if (video.status === 'ready') {
            return res.status(400).json({ error: 'Video already processed with AI' });
        }
        if (video.status === 'processing') {
            return res.status(409).json({ error: 'Video is already being processed' });
        }

        await db.query(`UPDATE videos SET status = 'processing' WHERE id = $1`, [videoId]);

        // Send the job to the BullMQ queue instead of blocking the Express thread
        await videoQueue.add('process-video', {
            videoId: video.id,
            s3Key: video.s3_key,
            filename: video.filename,
            contentId: video.content_id
        }, VIDEO_JOB_OPTIONS);

        res.status(202).json({
            success: true,
            message: 'AI processing started',
            videoId
        });

    } catch (err) {
        console.error('Error starting AI processing:', err);
        res.status(500).json({ error: 'Failed to start AI processing' });
    }
});

app.get('/api/videos/:id/ai-data', authenticateToken, async (req, res) => {
    const videoId = req.params.id;

    try {
        const result = await db.query(
            `SELECT v.id, v.summary, v.transcription, v.metadata, v.status, c.title 
             FROM videos v 
             JOIN contents c ON v.content_id = c.id 
             WHERE v.id = $1`,
            [videoId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const video = result.rows[0];
        const faqs = video.metadata?.faq || [];

        res.json({
            id: video.id,
            title: video.title,
            summary: video.summary,
            faqs: faqs,
            transcription: video.transcription,
            status: video.status,
            error: video.metadata?.error || null,
            processed: video.status === 'ready'
        });

    } catch (err) {
        console.error('Error fetching AI data:', err);
        res.status(500).json({ error: 'Failed to fetch AI data' });
    }
});

// GET - Video processing status (real-time status for monitoring)
app.get('/api/videos/:id/processing-status', authenticateToken, async (req, res) => {
    const videoId = req.params.id;

    try {
        const result = await db.query(
            `SELECT v.id, v.status, v.metadata, v.created_at, v.updated_at, c.title
             FROM videos v
             JOIN contents c ON v.content_id = c.id
             WHERE v.id = $1`,
            [videoId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const video = result.rows[0];
        const metadata = video.metadata || {};

        // Calculate processing time using processing_started timestamp from metadata
        // Only count time from when worker actually started, not from video creation
        const hasStarted = !!metadata.processing_started;
        const processingStarted = hasStarted
            ? new Date(metadata.processing_started)
            : null;

        let processingTimeSeconds = 0;
        let processingState = 'unknown';

        if (video.status === 'error') {
            processingState = 'error';
            if (processingStarted) {
                processingTimeSeconds = Math.floor((new Date(video.updated_at) - processingStarted) / 1000);
            }
        } else if (video.status === 'ready') {
            processingState = 'completed';
            if (processingStarted) {
                processingTimeSeconds = Math.floor((new Date(video.updated_at) - processingStarted) / 1000);
            }
        } else if (video.status === 'processing') {
            if (processingStarted) {
                processingState = 'processing';
                processingTimeSeconds = Math.floor((new Date() - processingStarted) / 1000);
            } else {
                processingState = 'queued';
                processingTimeSeconds = 0; // Show 0 while waiting in queue
            }
        }

        res.json({
            id: video.id,
            title: video.title,
            status: video.status, // 'processing', 'ready', 'error'
            processingState, // 'queued', 'processing', 'completed', 'error'
            current_stage: metadata.current_stage,
            processingStarted: metadata.processing_started,
            error: metadata.error,
            faqCount: metadata.faq?.length || 0,
            processingTimeSeconds,
            updated_at: video.updated_at
        });

    } catch (err) {
        console.error('Error fetching processing status:', err);
        res.status(500).json({ error: 'Failed to fetch processing status' });
    }
});

// --- AI Assistant Routes ---

// POST - Answer question using RAG
app.post('/api/ai/answer-question', authenticateToken, async (req, res) => {
    const { question, courseId, videoId } = req.body;

    if (!question || !courseId) {
        return res.status(400).json({ error: 'Question and courseId are required' });
    }

    try {
        const response = await generateResponse(question, courseId, req.user.id);
        res.json({ answer: response });
    } catch (err) {
        console.error('Error answering question:', err);
        res.status(500).json({ error: err.message || 'Failed to answer question' });
    }
});

// POST - Generate quiz based on course material with RAG
app.post('/api/ai/generate-quiz', authenticateToken, async (req, res) => {
    const { courseId, videoId, topic, numberOfQuestions, failedQuestions } = req.body;

    if (!courseId || !topic) {
        return res.status(400).json({ error: 'courseId and topic are required' });
    }

    try {
        // Generate quiz using RAG
        const questions = await generateQuizWithRag(
            courseId,
            videoId,
            topic,
            numberOfQuestions || 4,
            failedQuestions
        );

        // Auto-save the quiz
        const saveResult = await db.query(
            'INSERT INTO generated_quizzes (user_id, course_id, title, questions) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, courseId, `Quiz: ${topic}`, JSON.stringify(questions)]
        );

        const savedQuiz = saveResult.rows[0];

        res.json({
            id: savedQuiz.id,
            questions,
            saved: true
        });
    } catch (err) {
        console.error('Error generating quiz:', err);
        res.status(500).json({ error: err.message || 'Failed to generate quiz' });
    }
});

// POST - Generate flashcards for a topic with RAG
app.post('/api/ai/generate-flashcards', authenticateToken, async (req, res) => {
    const { courseId, videoId, topic } = req.body;

    if (!courseId || !topic) {
        return res.status(400).json({ error: 'courseId and topic are required' });
    }

    try {
        // Generate flashcards using RAG
        const flashcards = await generateFlashcardsWithRag(courseId, videoId, topic);

        // Auto-save the flashcards
        const savedFlashcards = [];
        for (const card of flashcards) {
            const result = await db.query(
                'INSERT INTO saved_flashcards (user_id, course_id, question, answer, source) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [req.user.id, courseId, card.question, card.answer, `Generated: ${topic}`]
            );
            savedFlashcards.push(result.rows[0]);
        }

        res.json({
            flashcards: savedFlashcards,
            saved: true
        });
    } catch (err) {
        console.error('Error generating flashcards:', err);
        res.status(500).json({ error: err.message || 'Failed to generate flashcards' });
    }
});

// GET - Stream video from S3/MinIO
app.get('/api/videos/:id/stream', async (req, res) => {
    const videoId = req.params.id;
    const token = req.headers['authorization']?.split(' ')[1] || req.query.token;

    if (!token) return res.sendStatus(401);

    try {
        jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.sendStatus(403);
    }

    try {
        const result = await db.query('SELECT s3_key FROM videos WHERE id = $1', [videoId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const s3Key = result.rows[0].s3_key;
        if (!s3Key) {
            return res.status(404).json({ error: 'Video file not found' });
        }

        // O player HTML5 precisa de suporte a Range Requests para permitir
        // avançar/voltar o vídeo — sem isso, o navegador só consegue baixar
        // o arquivo inteiro do início, e a barra de progresso fica travada.
        const head = await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }));
        const fileSize = head.ContentLength;
        const contentType = head.ContentType || 'video/mp4';
        const range = req.headers.range;

        if (range) {
            const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
            const start = parseInt(startStr, 10);
            const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            const response = await s3Client.send(new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3Key,
                Range: `bytes=${start}-${end}`,
            }));

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': contentType,
            });
            response.Body.pipe(res);
        } else {
            const response = await s3Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }));

            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
            });
            response.Body.pipe(res);
        }

    } catch (err) {
        console.error('Error streaming video:', err);
        res.status(500).json({ error: 'Failed to stream video' });
    }
});

// DELETE - Delete content (Generic)
app.delete('/api/contents/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);

    const contentId = req.params.id;

    try {
        // Check content type
        const contentRes = await db.query('SELECT * FROM contents WHERE id = $1', [contentId]);
        if (contentRes.rows.length === 0) return res.status(404).json({ error: 'Content not found' });

        const content = contentRes.rows[0];

        // If it's a video, redirect to video deletion logic (which handles S3, embeddings, etc.)
        if (content.type === 'VIDEO' || content.type === 'video') {
            const videoRes = await db.query('SELECT id FROM videos WHERE content_id = $1', [contentId]);
            if (videoRes.rows.length > 0) {
                const videoId = videoRes.rows[0].id;

                try {
                    await db.query('BEGIN');

                    // Get video details for cleanup
                    const videoData = await db.query('SELECT * FROM videos WHERE id = $1', [videoId]);
                    const video = videoData.rows[0];

                    // Cancel processing job if it exists
                    try {
                        const jobs = await videoQueue.getJobs(['waiting', 'active', 'delayed']);
                        const videoJob = jobs.find(job => job.data.videoId === videoId);
                        if (videoJob) {
                            await videoJob.remove();
                            console.log(`✓ Cancelled processing job for video ${videoId}`);
                        }
                    } catch (queueErr) {
                        console.error(`⚠ Failed to cancel job for video ${videoId}:`, queueErr.message);
                    }

                    // 1. Delete AI embeddings
                    await db.query("DELETE FROM documents WHERE metadata->>'video_id' = $1", [videoId.toString()]);
                    console.log(`✓ Deleted AI embeddings for video ${videoId}`);

                    // 2. Delete video segments
                    await db.query('DELETE FROM video_segments WHERE video_id = $1', [videoId]);
                    console.log(`✓ Deleted video segments for video ${videoId}`);

                    // 3. Delete video record
                    await db.query('DELETE FROM videos WHERE id = $1', [videoId]);
                    console.log(`✓ Deleted video record ${videoId}`);

                    // 4. Delete content record
                    await db.query('DELETE FROM contents WHERE id = $1', [contentId]);
                    console.log(`✓ Deleted content record ${contentId}`);

                    // 5. Delete from S3
                    if (video.s3_key) {
                        try {
                            await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: video.s3_key }));
                            console.log(`✓ Deleted S3 file: ${video.s3_key}`);
                        } catch (s3Err) {
                            console.error(`⚠ Failed to delete S3 file: ${video.s3_key}`, s3Err);
                        }
                    }

                    await db.query('COMMIT');
                    return res.json({ success: true, message: 'Video content deleted successfully' });

                } catch (deleteErr) {
                    await db.query('ROLLBACK');
                    console.error('Error deleting video content:', deleteErr);
                    throw deleteErr;
                }
            }
        }

        // Standard content deletion (PDF, Word, text, link, etc.)
        await db.query("DELETE FROM documents WHERE metadata->>'content_id' = $1", [contentId.toString()]);
        await db.query('DELETE FROM contents WHERE id = $1', [contentId]);

        const s3Key = content.data?.s3_key;
        if (s3Key) {
            try {
                await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: s3Key }));
                console.log(`✓ Deleted S3 file: ${s3Key}`);
            } catch (s3Err) {
                console.error(`⚠ Failed to delete S3 file: ${s3Key}`, s3Err);
            }
        }

        res.json({ success: true, message: 'Content deleted successfully' });

    } catch (err) {
        console.error('Error deleting content:', err);
        res.status(500).json({ error: 'Failed to delete content' });
    }
});

// --- Video CRUD Routes ---

// GET - List all videos (with optional filtering by module or course)
app.get('/api/videos', authenticateToken, async (req, res) => {
    const { module_id, course_id } = req.query;

    try {
        let query = `
            SELECT v.*, c.title as content_title, c.module_id, m.course_id
            FROM videos v
            JOIN contents c ON v.content_id = c.id
            JOIN modules m ON c.module_id = m.id
        `;
        const params = [];
        const conditions = [];

        if (module_id) {
            conditions.push(`c.module_id = $${params.length + 1}`);
            params.push(module_id);
        }

        if (course_id) {
            conditions.push(`m.course_id = $${params.length + 1}`);
            params.push(course_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY v.created_at DESC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching videos:', err);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
});

// GET - Get single video with full details
app.get('/api/videos/:id/details', authenticateToken, async (req, res) => {
    const videoId = req.params.id;

    try {
        const result = await db.query(`
            SELECT v.*, c.title as content_title, c.description, c.module_id,
                   m.title as module_title, m.course_id,
                   co.title as course_title
            FROM videos v
            JOIN contents c ON v.content_id = c.id
            JOIN modules m ON c.module_id = m.id
            JOIN courses co ON m.course_id = co.id
            WHERE v.id = $1
        `, [videoId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Video not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching video:', err);
        res.status(500).json({ error: 'Failed to fetch video' });
    }
});

// PUT - Update video metadata (title, description, etc)
app.put('/api/videos/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);

    const videoId = req.params.id;
    const { title, description, status } = req.body;

    try {
        // Update content record (title and description)
        const videoCheck = await db.query('SELECT content_id FROM videos WHERE id = $1', [videoId]);

        if (videoCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const contentId = videoCheck.rows[0].content_id;

        // Update content
        if (title || description) {
            const updates = [];
            const params = [];
            let paramCount = 1;

            if (title) {
                updates.push(`title = $${paramCount}`);
                params.push(sanitizeTitle(title));
                paramCount++;
            }

            if (description) {
                updates.push(`description = $${paramCount}`);
                params.push(description);
                paramCount++;
            }

            params.push(contentId);
            await db.query(
                `UPDATE contents SET ${updates.join(', ')} WHERE id = $${paramCount}`,
                params
            );
        }

        // Update video status if provided
        if (status) {
            await db.query(
                'UPDATE videos SET status = $1, updated_at = NOW() WHERE id = $2',
                [status, videoId]
            );
        }

        // Return updated video
        const updated = await db.query(`
            SELECT v.*, c.title as content_title, c.description
            FROM videos v
            JOIN contents c ON v.content_id = c.id
            WHERE v.id = $1
        `, [videoId]);

        res.json(updated.rows[0]);
    } catch (err) {
        console.error('Error updating video:', err);
        res.status(500).json({ error: 'Failed to update video' });
    }
});

// DELETE - Delete video and all related data (cascade)
app.delete('/api/videos/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);

    const videoId = req.params.id;

    try {
        await db.query('BEGIN');

        // Get video details for cleanup
        const videoData = await db.query('SELECT * FROM videos WHERE id = $1', [videoId]);

        if (videoData.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Video not found' });
        }

        const video = videoData.rows[0];
        const contentId = video.content_id;

        // 1. Delete AI embeddings from documents table
        await db.query(
            "DELETE FROM documents WHERE metadata->>'video_id' = $1",
            [videoId.toString()]
        );
        console.log(`✓ Deleted AI embeddings for video ${videoId}`);

        // 2. Delete video segments (if any)
        await db.query('DELETE FROM video_segments WHERE video_id = $1', [videoId]);
        console.log(`✓ Deleted video segments for video ${videoId}`);

        // 3. Delete video record (will cascade to related tables if FK configured)
        await db.query('DELETE FROM videos WHERE id = $1', [videoId]);
        console.log(`✓ Deleted video record ${videoId}`);

        // 4. Delete content record (will cascade if FK configured)
        await db.query('DELETE FROM contents WHERE id = $1', [contentId]);
        console.log(`✓ Deleted content record ${contentId}`);

        // 5. Delete from S3/MinIO if s3_key exists
        if (video.s3_key) {
            try {
                await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: video.s3_key }));
                console.log(`✓ Deleted S3 file: ${video.s3_key}`);
            } catch (s3Err) {
                console.error(`⚠ Failed to delete S3 file: ${video.s3_key}`, s3Err);
            }
        }

        await db.query('COMMIT');

        res.json({
            success: true,
            message: 'Video and all related data deleted successfully',
            deletedVideoId: videoId,
            deletedContentId: contentId
        });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Error deleting video:', err);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

// --- Legacy/Existing Routes (kept for compatibility or reference) ---

app.get('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({ status: 'ok', time: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

app.post('/api/agent', async (req, res) => {
    const { message, courseId } = req.body;
    try {
        const reply = await generateResponse(message, courseId);
        res.json({ reply });
    } catch (err) {
        console.error('Error in agent endpoint:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

// GET - Get single video with full details
app.get('/api/videos/:id/details', authenticateToken, async (req, res) => {
    const videoId = req.params.id;

    try {
        const result = await db.query(`
            SELECT v.*, c.title as content_title, c.description, c.module_id,
                   m.title as module_title, m.course_id,
                   co.title as course_title
            FROM videos v
            JOIN contents c ON v.content_id = c.id
            JOIN modules m ON c.module_id = m.id
            JOIN courses co ON m.course_id = co.id
            WHERE v.id = $1
        `, [videoId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Video not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching video:', err);
        res.status(500).json({ error: 'Failed to fetch video' });
    }
});

// PUT - Update video metadata (title, description, etc)
app.put('/api/videos/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);

    const videoId = req.params.id;
    const { title, description, status } = req.body;

    try {
        // Update content record (title and description)
        const videoCheck = await db.query('SELECT content_id FROM videos WHERE id = $1', [videoId]);

        if (videoCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const contentId = videoCheck.rows[0].content_id;

        // Update content
        if (title || description) {
            const updates = [];
            const params = [];
            let paramCount = 1;

            if (title) {
                updates.push(`title = $${paramCount}`);
                params.push(sanitizeTitle(title));
                paramCount++;
            }

            if (description) {
                updates.push(`description = $${paramCount}`);
                params.push(description);
                paramCount++;
            }

            params.push(contentId);
            await db.query(
                `UPDATE contents SET ${updates.join(', ')} WHERE id = $${paramCount}`,
                params
            );
        }

        // Update video status if provided
        if (status) {
            await db.query(
                'UPDATE videos SET status = $1, updated_at = NOW() WHERE id = $2',
                [status, videoId]
            );
        }

        // Return updated video
        const updated = await db.query(`
            SELECT v.*, c.title as content_title, c.description
            FROM videos v
            JOIN contents c ON v.content_id = c.id
            WHERE v.id = $1
        `, [videoId]);

        res.json(updated.rows[0]);
    } catch (err) {
        console.error('Error updating video:', err);
        res.status(500).json({ error: 'Failed to update video' });
    }
});

// DELETE - Delete video and all related data (cascade)
app.delete('/api/videos/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);

    const videoId = req.params.id;

    try {
        await db.query('BEGIN');

        // Get video details for cleanup
        const videoData = await db.query('SELECT * FROM videos WHERE id = $1', [videoId]);

        if (videoData.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Video not found' });
        }

        const video = videoData.rows[0];
        const contentId = video.content_id;

        // 1. Delete AI embeddings from documents table
        await db.query(
            "DELETE FROM documents WHERE metadata->>'video_id' = $1",
            [videoId.toString()]
        );
        console.log(`✓ Deleted AI embeddings for video ${videoId}`);

        // 2. Delete video segments (if any)
        await db.query('DELETE FROM video_segments WHERE video_id = $1', [videoId]);
        console.log(`✓ Deleted video segments for video ${videoId}`);

        // 3. Delete video record (will cascade to related tables if FK configured)
        await db.query('DELETE FROM videos WHERE id = $1', [videoId]);
        console.log(`✓ Deleted video record ${videoId}`);

        // 4. Delete content record (will cascade if FK configured)
        await db.query('DELETE FROM contents WHERE id = $1', [contentId]);
        console.log(`✓ Deleted content record ${contentId}`);

        // 5. Delete from S3/MinIO if s3_key exists
        if (video.s3_key) {
            try {
                await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: video.s3_key }));
                console.log(`✓ Deleted S3 file: ${video.s3_key}`);
            } catch (s3Err) {
                console.error(`⚠ Failed to delete S3 file: ${video.s3_key}`, s3Err);
            }
        }

        await db.query('COMMIT');

        res.json({
            success: true,
            message: 'Video and all related data deleted successfully',
            deletedVideoId: videoId,
            deletedContentId: contentId
        });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Error deleting video:', err);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

// --- Legacy/Existing Routes (kept for compatibility or reference) ---

app.get('/api/health', async (req, res) => {
    try {
        const result = await db.query('SELECT NOW()');
        res.json({ status: 'ok', time: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

app.post('/api/agent', async (req, res) => {
    const { message, courseId } = req.body;
    try {
        const reply = await generateResponse(message, courseId);
        res.json({ reply });
    } catch (err) {
        console.error('Error in agent endpoint:', err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server running on port ${PORT}`);
    console.log('✓ Environment:', process.env.NODE_ENV || 'development');
    console.log('✓ Database:', process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] : 'Not configured');
    console.log('✓ CORS enabled');

    // Verificar Whisper na inicialização
    (async () => {
        try {
            const { exec } = await import('child_process');
            const { promisify } = await import('util');
            const { homedir } = await import('os');
            const { existsSync } = await import('fs');
            const { join } = await import('path');
            const execPromise = promisify(exec);

            console.log('\n🔍 Verificando Whisper...');

            // Verificar se Whisper Python module está instalado
            try {
                const { stdout } = await execPromise('python3 -c "import whisper; print(whisper.__version__)"');
                const version = stdout.trim();
                console.log(`✅ Whisper instalado: v${version}`);

                // Verificar se o modelo está baixado
                const modelPath = join(homedir(), '.cache', 'whisper', 'medium.pt');
                if (existsSync(modelPath)) {
                    console.log('✅ Modelo medium.pt encontrado');
                    console.log('✅ Transcrição automática: HABILITADA');
                } else {
                    console.log('⚠️  Modelo medium.pt NÃO encontrado');
                    console.log('   Será baixado automaticamente no primeiro uso (~1.4GB)');
                    console.log('   Para baixar agora: python3 -c "import whisper; whisper.load_model(\'medium\')"');
                    console.log('⚠️  Transcrição automática: HABILITADA (com download pendente)');
                }
            } catch (err) {
                console.log('❌ Whisper: NÃO INSTALADO');
                console.log('   Execute: pip3 install openai-whisper');
                console.log('   Transcrição automática estará DESABILITADA');
            }
            console.log('');
        } catch (error) {
            console.log('⚠️  Erro ao verificar Whisper:', error.message);
        }
    })();
});
