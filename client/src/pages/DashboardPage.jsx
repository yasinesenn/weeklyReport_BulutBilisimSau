import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { getCurrentWeekYear } from '../utils/weekHelper';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import WeekSelector from '../components/filters/WeekSelector';
import ReportList from '../components/reports/ReportList';
import ReportForm from '../components/reports/ReportForm';
import ExportButton from '../components/export/ExportButton';
import { severityConfig } from '../components/reports/SeverityBadge';
import { Plus, Filter, Info, Sun, Cloud, AlertTriangle } from 'lucide-react';

export default function DashboardPage() {
    const { user } = useAuth();
    const { week: currentWeek, year: currentYear } = getCurrentWeekYear();

    const [week, setWeek] = useState(currentWeek);
    const [year, setYear] = useState(currentYear);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editReport, setEditReport] = useState(null);
    const [filterSeverity, setFilterSeverity] = useState(null);
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const params = { week, year };
            if (selectedTeam) params.teamId = selectedTeam;
            if (filterSeverity) params.severity = filterSeverity;
            const res = await api.get('/reports', { params });
            setReports(res.data);
        } catch (err) {
            console.error('Failed to fetch reports:', err);
        } finally {
            setLoading(false);
        }
    }, [week, year, selectedTeam, filterSeverity]);

    const fetchTeams = useCallback(async () => {
        try {
            const res = await api.get('/teams');
            setTeams(res.data);
        } catch (err) {
            console.error('Failed to fetch teams:', err);
        }
    }, []);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    const handleWeekChange = (newWeek, newYear) => {
        setWeek(newWeek);
        setYear(newYear);
    };

    const handleSubmitReport = async (formData, reportId) => {
        if (reportId) {
            await api.put(`/reports/${reportId}`, formData);
        } else {
            await api.post('/reports', { ...formData, week, year });
        }
        fetchReports();
    };

    const handleDeleteReport = async (id) => {
        if (!confirm('Bu raporu silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/reports/${id}`);
            fetchReports();
        } catch (err) {
            alert(err.response?.data?.error || 'Silme işlemi başarısız');
        }
    };

    const handleEdit = (report) => {
        setEditReport(report);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditReport(null);
    };

    // Stats
    const stats = {
        total: reports.length,
        highlight: reports.filter(r => r.severity === 'highlight').length,
        escalation: reports.filter(r => r.severity === 'escalation').length,
        lowlight: reports.filter(r => r.severity === 'lowlight').length,
        info: reports.filter(r => r.severity === 'info').length,
    };

    const severityFilterBtns = [
        { key: null, label: 'Tümü', count: stats.total },
        { key: 'highlight', label: 'Highlight', Icon: Sun, count: stats.highlight, color: 'text-amber-500' },
        { key: 'escalation', label: 'Escalation', Icon: AlertTriangle, count: stats.escalation, color: 'text-red-500' },
        { key: 'lowlight', label: 'Lowlight', Icon: Cloud, count: stats.lowlight, color: 'text-slate-500' },
        { key: 'info', label: 'Info', Icon: Info, count: stats.info, color: 'text-blue-500' },
    ];

    // Get the active team name
    const activeTeamName = selectedTeam
        ? teams.find(t => t.id === selectedTeam)?.name
        : (user?.teamId ? teams.find(t => t.id === user.teamId)?.name : null);

    return (
        <div className="flex min-h-screen bg-[var(--color-background)]">
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 ml-[260px] transition-all duration-300">
                <Header
                    title={`📋 Haftalık Rapor - ${year} W${String(week).padStart(2, '0')}`}
                    subtitle="Weekly Report Dashboard"
                    teamName={activeTeamName || 'Tüm Ekipler'}
                    logoSrc="/logo.png"
                />

                <main className="p-8">
                    {/* Top Controls */}
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                        <WeekSelector week={week} year={year} onChange={handleWeekChange} />

                        <div className="flex items-center gap-3">
                            {/* Team Filter */}
                            {teams.length > 1 ? (
                                <select
                                    value={selectedTeam}
                                    onChange={(e) => setSelectedTeam(e.target.value)}
                                    className="px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 shadow-sm"
                                >
                                    <option value="">Tüm Ekipler</option>
                                    {teams.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm">
                                    {teams[0]?.name || 'Ekibiniz'}
                                </div>
                            )}

                            <ExportButton week={week} year={year} teamId={selectedTeam} />

                            <button
                                onClick={() => setShowForm(true)}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all"
                            >
                                <Plus size={16} />
                                Yeni Rapor
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                        {severityFilterBtns.map((btn) => {
                            const isActive = filterSeverity === btn.key;
                            return (
                                <button
                                    key={btn.key || 'all'}
                                    onClick={() => setFilterSeverity(btn.key)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${isActive
                                        ? 'bg-white border-blue-300 ring-2 ring-blue-500/20 shadow-md'
                                        : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300'
                                        }`}
                                >
                                    {btn.Icon ? (
                                        <btn.Icon size={18} className={btn.color} />
                                    ) : (
                                        <Filter size={18} className="text-slate-400" />
                                    )}
                                    <div>
                                        <p className="text-lg font-bold text-slate-900">{btn.count}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{btn.label}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Reports */}
                    <ReportList
                        reports={reports}
                        loading={loading}
                        onEdit={handleEdit}
                        onDelete={handleDeleteReport}
                        currentUserId={user?.id}
                    />
                </main>
            </div>

            {/* Report Form Modal */}
            {showForm && (
                <ReportForm
                    report={editReport}
                    onSubmit={handleSubmitReport}
                    onClose={handleCloseForm}
                />
            )}
        </div>
    );
}
