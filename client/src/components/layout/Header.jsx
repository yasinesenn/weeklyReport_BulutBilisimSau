import { useAuth } from '../../context/AuthContext';
import { Bell, Search } from 'lucide-react';

export default function Header({ title, subtitle, teamName, logoSrc }) {
    const { user } = useAuth();

    return (
        <header className="flex items-center justify-between px-8 py-5 bg-white/80 glass border-b border-slate-200/60">
            <div className="flex items-center gap-4">
                {/* Logo */}
                {logoSrc && (
                    <img
                        src={logoSrc}
                        alt="Logo"
                        className="w-10 h-10 rounded-lg object-contain shadow-sm border border-slate-100"
                    />
                )}
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
                        {teamName && (
                            <span className="px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full border border-blue-200">
                                {teamName}
                            </span>
                        )}
                    </div>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Rapor ara..."
                        className="pl-9 pr-4 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 w-56 transition-all"
                    />
                </div>
                <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                </button>
                <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-xs font-semibold text-slate-700">{user?.name}</p>
                        <p className="text-[10px] text-slate-400">{user?.role}</p>
                    </div>
                </div>
            </div>
        </header>
    );
}
