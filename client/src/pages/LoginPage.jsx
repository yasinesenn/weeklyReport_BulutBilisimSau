import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, User } from 'lucide-react';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Giriş yapılamadı');
        } finally {
            setLoading(false);
        }
    };

    const demoAccounts = [
        { email: 'elif@company.com', name: 'Elif Demir', team: 'ICT-AO-NIQS' },
        { email: 'ahmet@company.com', name: 'Ahmet Yılmaz', team: 'ICT-AO-NIQS' },
        { email: 'can@company.com', name: 'Can Öztürk', team: 'ICT-AO-DEVOPS' },
        { email: 'zeynep@company.com', name: 'Zeynep Aksoy', team: 'ICT-AO-FRONTEND' },
        { email: 'mehmet@company.com', name: 'Mehmet Kara', team: 'ICT-AO-FRONTEND' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                        <FileText size={28} className="text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Weekly Report Portal</h1>
                    <p className="text-sm text-blue-300/60 mt-1">Kurumsal Haftalık Raporlama Sistemi</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/10 glass border border-white/20 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                                E-posta / Kullanıcı Adı
                            </label>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ornek@company.com veya kullanıcı.adı"
                                className="w-full px-4 py-3 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-blue-200 mb-1.5">
                                Şifre
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 text-sm bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-xs px-4 py-2.5 rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Giriş yapılıyor...
                                </>
                            ) : (
                                'Giriş Yap'
                            )}
                        </button>
                    </form>

                    {/* Demo Accounts */}
                    <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-3">
                            Demo Hesaplar
                        </p>
                        <div className="space-y-2">
                            {demoAccounts.map((acc) => (
                                <button
                                    key={acc.email}
                                    type="button"
                                    onClick={() => {
                                        setEmail(acc.email);
                                        setPassword('demo123');
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group"
                                >
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold bg-gradient-to-br from-emerald-400/30 to-teal-400/30 text-emerald-300">
                                        {acc.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-xs text-white/60 group-hover:text-white/80 font-medium">{acc.name}</p>
                                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold rounded-full uppercase bg-emerald-500/20 text-emerald-300">
                                                <User size={7} />
                                                Üye
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-white/30">{acc.team} • {acc.email}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
