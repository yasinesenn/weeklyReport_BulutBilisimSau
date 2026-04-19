import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { getCurrentWeekYear } from '../utils/weekHelper';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import WeekSelector from '../components/filters/WeekSelector';
import TeamActivityPanel from '../components/reports/TeamActivityPanel';

export default function TeamActivityPage() {
    const { user } = useAuth();

    const { week: currentWeek, year: currentYear } = getCurrentWeekYear();

    const [week, setWeek] = useState(currentWeek);
    const [year, setYear] = useState(currentYear);
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');

    const fetchTeams = useCallback(async () => {
        try {
            const res = await api.get('/teams');
            setTeams(res.data);
        } catch (err) {
            console.error('Failed to fetch teams:', err);
        }
    }, []);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    const handleWeekChange = (newWeek, newYear) => {
        setWeek(newWeek);
        setYear(newYear);
    };

    const activeTeamName = selectedTeam
        ? teams.find(t => t.id === selectedTeam)?.name
        : (user?.teamId ? teams.find(t => t.id === user.teamId)?.name : null);

    return (
        <div className="flex min-h-screen bg-[var(--color-background)]">
            <Sidebar />

            {/* Main Content */}
            <div className="flex-1 ml-[260px] transition-all duration-300">
                <Header
                    title={`👥 Ekip Aktivite Paneli - ${year} W${String(week).padStart(2, '0')}`}
                    subtitle="Weekly Report Activity Panel"
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
                        </div>
                    </div>

                    <TeamActivityPanel week={week} year={year} teamId={selectedTeam} />
                </main>
            </div>
        </div>
    );
}
