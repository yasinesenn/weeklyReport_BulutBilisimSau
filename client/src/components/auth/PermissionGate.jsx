import { useAuth } from '../../context/AuthContext';

/**
 * PermissionGate — Conditionally renders children based on team membership
 * 
 * Props:
 *   teamId?: string  — optional team check (only show if user belongs to this team)
 *   fallback?: JSX   — optional fallback to render when denied
 * 
 * Usage:
 *   <PermissionGate teamId={report.teamId}>
 *     <EditButton />
 *   </PermissionGate>
 */
export default function PermissionGate({ teamId, fallback = null, children }) {
    const { user } = useAuth();

    if (!user) return fallback;

    // Check team membership if specified
    if (teamId && user.teamId !== teamId) {
        return fallback;
    }

    return children;
}
