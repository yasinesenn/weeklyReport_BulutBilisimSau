/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Simplified: All authenticated users within the same team have equal permissions.
 * 
 * Provides middleware functions for:
 * 1. requireTeamAccess - ensure users only access their own team's data
 * 2. requireReportPermission - team membership check for report mutations
 */

/**
 * Ensure the user can only access data from their own team.
 * Checks teamId in query params, body, or route params.
 * If no teamId is provided, allows access (for listing all).
 */
function requireTeamAccess(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Extract teamId from various sources
    const teamId = req.query?.teamId || req.body?.teamId || req.params?.teamId;

    // If a specific team is targeted, verify it matches the user's team
    if (teamId && teamId !== req.user.teamId) {
        return res.status(403).json({ error: 'Cross-team access is not allowed' });
    }

    next();
}

/**
 * Check if user can modify (edit/delete) a specific report.
 * 
 * Rule: Any authenticated user can modify any report within their own team.
 * 
 * @param {Function} getDb - function that returns the DB adapter
 */
function requireReportPermission(getDb) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const db = getDb();
            const report = await db.findById('reports', req.params.id);

            if (!report) {
                return res.status(404).json({ error: 'Report not found' });
            }

            // Store for later use in the route handler
            req.report = report;

            const isSameTeam = report.teamId === req.user.teamId;

            if (isSameTeam) {
                return next();
            }

            return res.status(403).json({
                error: 'You can only modify reports within your own team',
            });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    };
}

module.exports = { requireTeamAccess, requireReportPermission };
