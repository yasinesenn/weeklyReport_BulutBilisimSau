const express = require('express');
const { generateToken } = require('../middleware/auth');
const { LDAP_CONFIG, ldapAuthenticate } = require('../services/ldap');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

module.exports = function (db) {
    // POST /api/auth/login
    // Supports two modes:
    //   LDAP mode (LDAP_ENABLED=true): authenticate via AD with username
    //   Demo mode (LDAP_ENABLED=false): authenticate with email/password from DB
    router.post('/login', async (req, res) => {
        try {
            if (LDAP_CONFIG.enabled) {
                return await handleLdapLogin(req, res, db);
            }
            return await handleDemoLogin(req, res, db);
        } catch (err) {
            console.error('Login error:', err.message);
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/auth/me
    router.get('/me', async (req, res) => {
        try {
            const user = await db.findById('users', req.user.id);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            const { password: _, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};

/**
 * LDAP Authentication Flow:
 * 1. Authenticate against AD with username/password
 * 2. Parse AD groups to determine teamSlug
 * 3. Find or create matching team in DB
 * 4. Find or create/update user in DB
 * 5. Return JWT token
 */
async function handleLdapLogin(req, res, db) {
    const { username, email, password } = req.body;
    let loginField = (username || email || '').trim();

    // LDAP lookup is based on sAMAccountName, so strip domain/email suffix if provided.
    if (loginField.includes('@')) {
        loginField = loginField.split('@')[0];
    }

    if (!loginField || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    try {
        // Step 1: LDAP authentication + group parsing
        const ldapUser = await ldapAuthenticate(loginField, password);

        if (!ldapUser.teamSlug) {
            return res.status(403).json({
                error: 'No team role group found in your AD membership. Contact your administrator.',
            });
        }

        // Step 2: Find or create the team
        let teams = await db.findAll('teams');
        let team = teams.find(t => t.slug === ldapUser.teamSlug || t.name === ldapUser.teamSlug);

        if (!team) {
            team = {
                id: `team-${uuidv4().slice(0, 8)}`,
                name: ldapUser.teamSlug,
                slug: ldapUser.teamSlug,
                department: 'General',
            };
            await db.create('teams', team);
            console.log(`📁 Auto-created team: ${team.name} (${team.id})`);
        }

        // Step 3: Find or create/update the user
        const existingUsers = await db.findAll('users', { email: ldapUser.email });
        let user;

        if (existingUsers.length > 0) {
            const existingUser = existingUsers[0];

            // Update existing user with latest LDAP info
            user = await db.update('users', existingUser.id, {
                name: ldapUser.name,
                username: ldapUser.username,
                teamId: team.id,
                ldapGroups: ldapUser.ldapGroups,
                updatedAt: new Date().toISOString(),
            });
        } else {
            user = {
                id: `user-${uuidv4().slice(0, 8)}`,
                name: ldapUser.name,
                email: ldapUser.email,
                username: ldapUser.username,
                teamId: team.id,
                ldapGroups: ldapUser.ldapGroups,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await db.create('users', user);
            console.log(`👤 Auto-created user: ${user.name} (${team.name})`);
        }

        const token = generateToken(user);
        const { password: _, ldapGroups: __, ...safeUser } = user;

        res.json({ token, user: safeUser });
    } catch (err) {
        if (err.message.includes('Invalid LDAP credentials') || err.message.includes('User not found')) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        throw err;
    }
}

/**
 * Demo Authentication Flow (when LDAP is disabled):
 * Authenticates with email/password from the local DB
 */
async function handleDemoLogin(req, res, db) {
    const { email, password, username } = req.body;
    const loginField = email || username;

    if (!loginField || !password) {
        return res.status(400).json({ error: 'Email/username and password are required' });
    }

    // Try finding by email first, then by username
    let users = await db.findAll('users', { email: loginField });
    if (users.length === 0) {
        users = await db.findAll('users', { username: loginField });
    }

    const user = users[0];

    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    res.json({ token, user: userWithoutPassword });
}
