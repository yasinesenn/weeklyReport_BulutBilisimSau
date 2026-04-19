const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireReportPermission } = require('../middleware/rbac');
const router = express.Router();

module.exports = function (db) {
    const getDb = () => db;

    // GET /api/reports?week=&year=&teamId=&severity=
    router.get('/', async (req, res) => {
        try {
            const { week, year, severity } = req.query;
            const filter = {};
            if (week) filter.week = parseInt(week);
            if (year) filter.year = parseInt(year);
            if (severity) filter.severity = severity;
            
            // Enforce team isolation
            filter.teamId = req.user.teamId;

            let reports = await db.findAll('reports', filter);

            // Enrich with user info
            const users = await db.findAll('users');
            const userMap = {};
            users.forEach(u => {
                const { password, ...safe } = u;
                userMap[u.id] = safe;
            });

            reports = reports.map(r => ({
                ...r,
                user: userMap[r.userId] || null,
            }));

            // Sort by severity priority then by createdAt
            const severityOrder = { highlight: 0, escalation: 1, lowlight: 2, info: 3 };
            reports.sort((a, b) => {
                const sPri = (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99);
                if (sPri !== 0) return sPri;
                return new Date(b.createdAt) - new Date(a.createdAt);
            });

            res.json(reports);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/reports/team-activity?week=&year=
    // Returns per-user report counts (accessible to all team members)
    router.get('/team-activity', async (req, res) => {
        try {
            const { week, year } = req.query;
            const filter = {};
            if (week) filter.week = parseInt(week);
            if (year) filter.year = parseInt(year);
            
            // Enforce team isolation
            const enforcedTeamId = req.user.teamId;
            filter.teamId = enforcedTeamId;

            const reports = await db.findAll('reports', filter);
            const users = await db.findAll('users');

            // Build a map of teamId -> users (filter by teamId if provided)
            const relevantUsers = users.filter(u => u.teamId === enforcedTeamId);

            const activity = relevantUsers.map(u => {
                const userReports = reports.filter(r => r.userId === u.id);
                return {
                    userId: u.id,
                    name: u.name,
                    email: u.email,
                    reportCount: userReports.length,
                    severities: {
                        highlight: userReports.filter(r => r.severity === 'highlight').length,
                        escalation: userReports.filter(r => r.severity === 'escalation').length,
                        lowlight: userReports.filter(r => r.severity === 'lowlight').length,
                        info: userReports.filter(r => r.severity === 'info').length,
                    },
                };
            });

            // Sort: users with reports first, then by count desc
            activity.sort((a, b) => b.reportCount - a.reportCount);

            res.json(activity);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/reports/:id
    router.get('/:id', async (req, res) => {
        try {
            const report = await db.findById('reports', req.params.id);
            if (!report) {
                return res.status(404).json({ error: 'Report not found' });
            }
            res.json(report);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/reports — All users can create
    router.post('/', async (req, res) => {
        try {
            const { appName, severity, content, week, year, importance } = req.body;
            const category = req.body.category || '';

            if (!appName || !severity || !content) {
                return res.status(400).json({ error: 'appName, severity, and content are required' });
            }

            const validSeverities = ['info', 'highlight', 'lowlight', 'escalation'];
            if (!validSeverities.includes(severity)) {
                return res.status(400).json({ error: `severity must be one of: ${validSeverities.join(', ')}` });
            }

            const importanceLevel = Math.min(3, Math.max(1, parseInt(importance) || 1));

            const now = new Date();
            const report = {
                id: uuidv4(),
                userId: req.user.id,
                teamId: req.user.teamId,
                appName,
                category,
                severity,
                importance: importanceLevel,
                content,
                week: week || getISOWeek(now),
                year: year || now.getFullYear(),
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
            };

            await db.create('reports', report);
            res.status(201).json(report);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/reports/:id
    // Any user within the same team can edit
    router.put('/:id', requireReportPermission(getDb), async (req, res) => {
        try {
            const { appName, category, severity, content, importance } = req.body;
            const updates = { updatedAt: new Date().toISOString() };
            if (appName) updates.appName = appName;
            if (category) updates.category = category;
            if (severity) updates.severity = severity;
            if (content) updates.content = content;
            if (importance !== undefined) updates.importance = Math.min(3, Math.max(1, parseInt(importance) || 1));

            const updated = await db.update('reports', req.params.id, updates);
            res.json(updated);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/reports/:id
    // Any user within the same team can delete
    router.delete('/:id', requireReportPermission(getDb), async (req, res) => {
        try {
            await db.delete('reports', req.params.id);
            res.json({ message: 'Report deleted' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}
