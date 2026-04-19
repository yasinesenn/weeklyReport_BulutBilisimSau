import { useAuth } from '../../context/AuthContext';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    FileText,
    Users,
    ChevronLeft,
    ChevronRight,
    User,
    NotebookText,
} from 'lucide-react';
import { useState } from 'react';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside
            className={`fixed top-0 left-0 h-screen bg-[var(--color-sidebar)] text-white flex flex-col transition-all duration-300 z-50 ${collapsed ? 'w-[68px]' : 'w-[260px]'
                }`}
        >
            {/* Logo / Header */}
            <div className="flex items-center gap-3 px-5 py-6 border-b border-white/10">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-white" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-sm font-bold tracking-tight leading-tight">Weekly Report</h1>
                        <p className="text-[10px] text-blue-300/70 font-medium">Portal</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3">
                <div className={`mb-3 ${collapsed ? 'px-0' : 'px-2'}`}>
                    {!collapsed && (
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">
                            Menu
                        </p>
                    )}
                </div>
                <NavLink
                    to="/"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                        isActive ? 'bg-[var(--color-sidebar-active)] text-blue-300' : 'text-slate-400 hover:bg-[var(--color-sidebar-hover)] hover:text-slate-200'
                    }`}
                >
                    <LayoutDashboard size={18} />
                    {!collapsed && <span className="text-sm font-medium">Dashboard</span>}
                </NavLink>
                <NavLink
                    to="/activity"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                        isActive ? 'bg-[var(--color-sidebar-active)] text-blue-300' : 'text-slate-400 hover:bg-[var(--color-sidebar-hover)] hover:text-slate-200'
                    }`}
                >
                    <Users size={18} />
                    {!collapsed && <span className="text-sm font-medium">Aktiviteler</span>}
                </NavLink>
                <NavLink
                    to="/templates"
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                        isActive ? 'bg-[var(--color-sidebar-active)] text-blue-300' : 'text-slate-400 hover:bg-[var(--color-sidebar-hover)] hover:text-slate-200'
                    }`}
                >
                    <NotebookText size={18} />
                    {!collapsed && <span className="text-sm font-medium">Şablonlar</span>}
                </NavLink>
            </nav>

            {/* User Profile */}
            <div className="border-t border-white/10 p-4">
                <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold bg-gradient-to-br from-emerald-400 to-teal-500">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name}</p>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-300">
                                    <User size={8} />
                                    Üye
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">{user?.appName || user?.email}</p>
                        </div>
                    )}
                    {!collapsed && (
                        <button
                            onClick={logout}
                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                            title="Çıkış"
                        >
                            <LogOut size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="absolute -right-3 top-20 w-6 h-6 bg-[var(--color-sidebar)] border border-white/20 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
                {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
        </aside>
    );
}
