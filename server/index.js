import express from 'express';
import cors from 'cors';
import db from './db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateResponse } from './services/geminiAgent.js';

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_me';

app.use(cors());
app.use(express.json());

// --- Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- Auth Routes ---

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'User not found' });

        if (await bcrypt.compare(password, user.password_hash)) {
            const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET);
            res.json({ token, user: { id: user.id, name: user.name, role: user.role, email: user.email } });
        } else {
            res.status(401).json({ error: 'Invalid password' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/auth/register', authenticateToken, async (req, res) => {
    // Only Admin can register new users (or maybe professors can register students? sticking to plan: Admin creates)
    if (req.user.role !== 'admin') return res.sendStatus(403);

    const { name, email, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.query(
            'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [name, email, hashedPassword, role]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// --- Course Routes ---

// Get all courses (for student enrollment or admin view) or courses for specific professor
app.get('/api/courses', authenticateToken, async (req, res) => {
    try {
        let query = 'SELECT * FROM courses';
        let params = [];

        if (req.user.role === 'professor') {
            query += ' WHERE professor_id = $1';
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

app.get('/api/courses/:id', authenticateToken, async (req, res) => {
    try {
        const courseId = req.params.id;
        const course = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);

        if (course.rows.length === 0) return res.status(404).json({ error: 'Course not found' });

        // Fetch modules and contents
        const modules = await db.query('SELECT * FROM modules WHERE course_id = $1 ORDER BY order_index', [courseId]);
        const contents = await db.query(`
            SELECT c.* FROM contents c
            JOIN modules m ON c.module_id = m.id
            WHERE m.course_id = $1
            ORDER BY c.order_index
        `, [courseId]);

        // Organize into tree structure
        const modulesMap = modules.rows.map(m => ({ ...m, contents: [], subModules: [] }));
        const contentMap = contents.rows;

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

// --- Content Routes ---

app.post('/api/contents', authenticateToken, async (req, res) => {
    if (req.user.role !== 'professor' && req.user.role !== 'admin') return res.sendStatus(403);
    const { module_id, title, type, data } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO contents (module_id, title, type, data) VALUES ($1, $2, $3, $4) RETURNING *',
            [module_id, title, type, data]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create content' });
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
