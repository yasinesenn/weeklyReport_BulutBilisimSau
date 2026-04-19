const express = require('express');
const router = express.Router();

module.exports = function (db) {
    // GET /api/teams
    router.get('/', async (req, res) => {
        try {
            const teams = await db.findAll('teams', { id: req.user.teamId });
            res.json(teams);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/teams/:id
    router.get('/:id', async (req, res) => {
        try {
            const team = await db.findById('teams', req.params.id);
            if (!team) {
                return res.status(404).json({ error: 'Team not found' });
            }
            res.json(team);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/teams/:id/members
    router.get('/:id/members', async (req, res) => {
        try {
            const users = await db.findAll('users', { teamId: req.params.id });
            const safeUsers = users.map(({ password, ...rest }) => rest);
            res.json(safeUsers);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
