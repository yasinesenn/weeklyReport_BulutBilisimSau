const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');
const { getAdapter } = require('./db_config');
const { authMiddleware } = require('./middleware/auth');
const { exportToPDF, exportTemplateToPDF } = require('./utils/pdf-export');

const app = express();
const PORT = config.port;

// ---- Middleware ----
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads (OpenShift PVC Support)
const uploadsDir = path.resolve(config.uploadDir);
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// ---- Database Init ----
const db = getAdapter();

// ---- Health Probes (OpenShift/Kubernetes) ----
app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.get('/readyz', async (req, res) => {
    try {
        if (config.db.adapter === 'postgresql' && typeof db.query === 'function') {
            await db.query('SELECT 1');
        } else {
            await db.findAll('teams');
        }
        return res.status(200).json({ status: 'ready' });
    } catch (err) {
        return res.status(503).json({ status: 'not-ready', error: err.message });
    }
});

// Seed data on first run
const { teams, users, reports, templates } = require('./db/seed');
(async () => {
    const existingTeams = await db.findAll('teams');
    if (existingTeams.length === 0) {
        console.log('🌱 Seeding initial data...');
        for (const team of teams) await db.create('teams', team);
        for (const user of users) await db.create('users', user);
        for (const report of reports) await db.create('reports', report);
        for (const template of templates) await db.create('templates', template);
        console.log('✅ Seed data loaded successfully');
    }
})();

// ---- File Upload ----
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/upload', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
});

// ---- API Routes ----
const authRoutes = require('./routes/auth')(db);
const teamRoutes = require('./routes/teams')(db);
const reportRoutes = require('./routes/reports')(db);
const templateRoutes = require('./routes/templates')(db);

// Auth routes (login is public, /me requires auth)
app.use('/api/auth', (req, res, next) => {
    if (req.path === '/login' && req.method === 'POST') {
        return authRoutes(req, res, next);
    }
    authMiddleware(req, res, () => authRoutes(req, res, next));
});

app.use('/api/teams', authMiddleware, teamRoutes);
app.use('/api/reports', authMiddleware, reportRoutes);
app.use('/api/templates', authMiddleware, templateRoutes);

// ---- Public Shared Template Endpoint (no auth) ----
app.get('/api/shared/:token', async (req, res) => {
    try {
        const allTemplates = await db.findAll('templates');
        const template = allTemplates.find(t => t.shareToken === req.params.token);
        if (!template) {
            return res.status(404).json({ error: 'Paylaşılan template bulunamadı veya paylaşım iptal edilmiş' });
        }
        // Return template with parsed items but without sensitive info
        const items = typeof template.items === 'string' ? JSON.parse(template.items) : (template.items || []);
        res.json({
            id: template.id,
            name: template.name,
            items,
            teamId: template.teamId,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---- PDF Export (supports token in query param for direct browser download) ----
app.get('/api/export/pdf', (req, res, next) => {
    // Allow token via query param for direct browser download
    if (req.query.token && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    authMiddleware(req, res, next);
}, async (req, res) => {
    try {
        const { week, year } = req.query;
        if (!week || !year) {
            return res.status(400).json({ error: 'week and year query params are required' });
        }

        const filter = { week: parseInt(week), year: parseInt(year) };
        filter.teamId = req.user.teamId; // Enforce isolation

        let reports = await db.findAll('reports', filter);

        // Enrich with user info
        const allUsers = await db.findAll('users');
        const userMap = {};
        allUsers.forEach(u => {
            const { password, ...safe } = u;
            userMap[u.id] = safe;
        });
        reports = reports.map(r => ({ ...r, user: userMap[r.userId] || null }));

        // Get team name for header
        let teamName = null;
        if (req.user.teamId) {
            const team = await db.findById('teams', req.user.teamId);
            teamName = team?.name || null;
        }

        const result = await exportToPDF(reports, parseInt(week), parseInt(year), teamName);

        if (result.type === 'pdf') {
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="weekly-report-${year}-W${week}.pdf"`,
                'Content-Length': result.buffer.length,
            });
        } else {
            res.set({
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `attachment; filename="weekly-report-${year}-W${week}.html"`,
                'Content-Length': result.buffer.length,
            });
        }
        res.end(result.buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---- Template PDF Export ----
app.get('/api/export/template/:id', (req, res, next) => {
    // Allow token via query param for direct browser download
    if (req.query.token && !req.headers.authorization) {
        req.headers.authorization = `Bearer ${req.query.token}`;
    }
    authMiddleware(req, res, next);
}, async (req, res) => {
    try {
        const template = await db.findById('templates', req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }
        // Only owner can export
        if (template.userId !== req.user.id) {
            return res.status(403).json({ error: 'Bu template size ait değil' });
        }

        const items = typeof template.items === 'string'
            ? JSON.parse(template.items)
            : (template.items || []);

        const safeName = template.name.replace(/[^a-zA-Z0-9_-]/g, '_');
        const result = await exportTemplateToPDF(template, items);

        if (result.type === 'pdf') {
            res.set({
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
                'Content-Length': result.buffer.length,
            });
        } else {
            res.set({
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': `attachment; filename="${safeName}.html"`,
                'Content-Length': result.buffer.length,
            });
        }
        res.end(result.buffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ---- Start Server ----
app.listen(PORT, () => {
    console.log(`\n🚀 Weekly Report Server running at http://localhost:${PORT}`);
    console.log(`📁 Database adapter: ${process.env.DB_ADAPTER || 'json'}`);
    console.log(`📂 Uploads directory: ${uploadsDir}\n`);
});

module.exports = app;
