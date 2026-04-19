import { useState, useEffect, useCallback } from 'react';
import { Users, FileText, Sun, AlertTriangle, Cloud, Info, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/client';

const severityIcons = [
    { key: 'highlight', Icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50' },
    { key: 'escalation', Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    { key: 'lowlight', Icon: Cloud, color: 'text-slate-400', bg: 'bg-slate-50' },
    { key: 'info', Icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
];

export default function TeamActivityPanel({ week, year, teamId }) {
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);

    const fetchActivity = useCallback(async () => {
        setLoading(true);
        try {
            const params = { week, year };
            if (teamId) params.teamId = teamId;
            const res = await api.get('/reports/team-activity', { params });
            setActivity(res.data);
        } catch (err) {
            console.error('Failed to fetch team activity:', err);
        } finally {
            setLoading(false);
        }
    }, [week, year, teamId]);

    useEffect(() => {
        fetchActivity();
    }, [fetchActivity]);

    const totalReports = activity.reduce((sum, u) => sum + u.reportCount, 0);
    const activeUsers = activity.filter(u => u.reportCount > 0).length;

    return (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden mb-6 animate-fade-in-up">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-purple-500/20">
                        <Users size={16} className="text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-slate-900">Ekip Aktivitesi</h3>
                        <p className="text-[10px] text-slate-400 font-medium">
                            {activeUsers}/{activity.length} üye rapor girdi · Toplam {totalReports} rapor
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">
                        Ekip
                    </span>
                    {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
            </button>

            {/* Content */}
            {expanded && (
                <div className="border-t border-slate-100">
                    {loading ? (
                        <div className="p-6 text-center text-sm text-slate-400">Yükleniyor...</div>
                    ) : activity.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-400">Ekip üyesi bulunamadı</div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {activity.map((user) => (
                                <div key={user.userId} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                                    {/* User Info (Left) */}
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="relative flex-shrink-0">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm ${user.reportCount > 0
                                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                                    : 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-500'
                                                }`}>
                                                {user.name?.charAt(0) || '?'}
                                            </div>
                                        </div>
                                        <div className="min-w-0 pr-4">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="text-sm font-bold text-slate-800 truncate">{user.name}</p>
                                                {user.reportCount === 0 && (
                                                    <span className="text-[9px] font-bold text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                                        Giriş Yok
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-medium text-slate-500 truncate">{user.email}</p>
                                        </div>
                                    </div>

                                    {/* Stats (Right) */}
                                    <div className="flex items-center gap-6 flex-shrink-0">
                                        {/* Severity Breakdown */}
                                        <div className="flex items-center gap-4">
                                            {severityIcons.map(({ key, Icon, color, bg }) => {
                                                const count = user.severities[key] || 0;
                                                return (
                                                    <div key={key} className="flex flex-col items-center min-w-[32px] group" title={key}>
                                                        <div className={`p-1.5 rounded-lg mb-1 transition-colors ${count > 0 ? bg : 'bg-slate-50'}`}>
                                                            <Icon size={14} className={count > 0 ? color : 'text-slate-300'} />
                                                        </div>
                                                        <span className={`text-xs font-bold leading-none ${count > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                                                            {count}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Vertical Divider */}
                                        <div className="w-px h-10 bg-slate-200 hidden sm:block"></div>

                                        {/* Total Count */}
                                        <div className="flex flex-col items-end min-w-[64px]">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Toplam</span>
                                            <div className="flex items-center gap-1.5">
                                                <FileText size={14} className={user.reportCount > 0 ? 'text-blue-500' : 'text-slate-300'} />
                                                <span className={`text-xl font-black leading-none ${user.reportCount > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                                                    {user.reportCount}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
