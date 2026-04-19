const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const router = express.Router();

module.exports = function (db) {

    // GET /api/templates — only current user's templates
    router.get('/', async (req, res) => {
        try {
            const templates = await db.findAll('templates', { userId: req.user.id });
            // Sort by updatedAt desc
            templates.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            res.json(templates);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/templates/:id
    router.get('/:id', async (req, res) => {
        try {
            const template = await db.findById('templates', req.params.id);
            if (!template) {
                return res.status(404).json({ error: 'Template not found' });
            }
            // Only owner can view
            if (template.userId !== req.user.id) {
                return res.status(403).json({ error: 'Bu template size ait değil' });
            }
            res.json(template);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/templates — create new template
    router.post('/', async (req, res) => {
        try {
            const { name, items } = req.body;
            if (!name || !name.trim()) {
                return res.status(400).json({ error: 'Template adı gerekli' });
            }

            const now = new Date().toISOString();
            const template = {
                id: uuidv4(),
                userId: req.user.id,
                teamId: req.user.teamId,
                name: name.trim(),
                items: JSON.stringify(Array.isArray(items) ? items.map(item => ({
                    id: item.id || uuidv4(),
                    appName: item.appName || '',
                    severity: item.severity || 'info',
                    importance: item.importance || 1,
                    content: item.content || '',
                })) : []),
                shareToken: null,
                createdAt: now,
                updatedAt: now,
            };

            await db.create('templates', template);
            // Parse items back for response
            const result = { ...template, items: JSON.parse(template.items) };
            res.status(201).json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/templates/:id — update template
    router.put('/:id', async (req, res) => {
        try {
            const template = await db.findById('templates', req.params.id);
            if (!template) {
                return res.status(404).json({ error: 'Template not found' });
            }
            if (template.userId !== req.user.id) {
                return res.status(403).json({ error: 'Sadece kendi template\'lerinizi düzenleyebilirsiniz' });
            }

            const { name, items } = req.body;
            const updates = { updatedAt: new Date().toISOString() };
            if (name !== undefined) updates.name = name.trim();
            if (items !== undefined) {
                updates.items = JSON.stringify(Array.isArray(items) ? items.map(item => ({
                    id: item.id || uuidv4(),
                    appName: item.appName || '',
                    severity: item.severity || 'info',
                    importance: item.importance || 1,
                    content: item.content || '',
                })) : []);
            }

            const updated = await db.update('templates', req.params.id, updates);
            // Parse items for response
            if (updated && updated.items && typeof updated.items === 'string') {
                updated.items = JSON.parse(updated.items);
            }
            res.json(updated);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/templates/:id
    router.delete('/:id', async (req, res) => {
        try {
            const template = await db.findById('templates', req.params.id);
            if (!template) {
                return res.status(404).json({ error: 'Template not found' });
            }
            if (template.userId !== req.user.id) {
                return res.status(403).json({ error: 'Sadece kendi template\'lerinizi silebilirsiniz' });
            }

            await db.delete('templates', req.params.id);
            res.json({ message: 'Template silindi' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/templates/:id/share — generate share token
    router.post('/:id/share', async (req, res) => {
        try {
            const template = await db.findById('templates', req.params.id);
            if (!template) {
                return res.status(404).json({ error: 'Template not found' });
            }
            if (template.userId !== req.user.id) {
                return res.status(403).json({ error: 'Sadece kendi template\'lerinizi paylaşabilirsiniz' });
            }

            const shareToken = crypto.randomBytes(16).toString('hex');
            const updated = await db.update('templates', req.params.id, {
                shareToken,
                updatedAt: new Date().toISOString(),
            });

            if (updated && updated.items && typeof updated.items === 'string') {
                updated.items = JSON.parse(updated.items);
            }

            res.json({ shareToken, template: updated });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/templates/:id/share — revoke share token
    router.delete('/:id/share', async (req, res) => {
        try {
            const template = await db.findById('templates', req.params.id);
            if (!template) {
                return res.status(404).json({ error: 'Template not found' });
            }
            if (template.userId !== req.user.id) {
                return res.status(403).json({ error: 'Yetkiniz yok' });
            }

            await db.update('templates', req.params.id, {
                shareToken: null,
                updatedAt: new Date().toISOString(),
            });

            res.json({ message: 'Paylaşım iptal edildi' });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
