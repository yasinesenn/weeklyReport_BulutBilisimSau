import { useAuth } from '../context/AuthContext';

/**
 * Permission hook for team-based UI control
 * 
 * All users within the same team have equal permissions.
 * 
 * Usage:
 *   const { canEdit, canDelete } = usePermission();
 *   if (canEdit(report)) { ... }
 */
export function usePermission() {
    const { user } = useAuth();

    /**
     * Check if current user can edit a report
     * Any user can edit reports within their own team
     */
    const canEdit = (report) => {
        if (!user || !report) return false;
        return report.teamId === user.teamId;
    };

    /**
     * Check if current user can delete a report
     * Same rules as canEdit
     */
    const canDelete = (report) => {
        if (!user || !report) return false;
        return report.teamId === user.teamId;
    };

    return {
        teamId: user?.teamId,
        canEdit,
        canDelete,
        canCreate: !!user,
    };
}
