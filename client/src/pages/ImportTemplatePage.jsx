import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import {
    FileText, Plus, Check, Download, ArrowLeft,
    Info, Sun, Cloud, AlertTriangle, Loader2
} from 'lucide-react';

const severityConfig = {
    info: { Icon: Info, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Info' },
    highlight: { Icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50', label: 'Highlight' },
    lowlight: { Icon: Cloud, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Lowlight' },
    escalation: { Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50', label: 'Escalation' },
};

export default function ImportTemplatePage() {
    const { token } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [sharedTemplate, setSharedTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(new Set());
    const [importing, setImporting] = useState(false);
    const [importDone, setImportDone] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [myTemplates, setMyTemplates] = useState([]);
    const [targetTemplateId, setTargetTemplateId] = useState('__new__');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sharedRes, myRes] = await Promise.all([
                    api.get(`/shared/${token}`),
                    api.get('/templates'),
                ]);
                setSharedTemplate(sharedRes.data);
                setTemplateName(`${sharedRes.data.name} (İçe Aktarma)`);
                setSelected(new Set((sharedRes.data.items || []).map((_, i) => i)));
                // Parse items for existing templates
                setMyTemplates(myRes.data.map(t => ({
                    ...t,
                    items: typeof t.items === 'string' ? JSON.parse(t.items) : (t.items || []),
                })));
            } catch (err) {
                setError(err.response?.data?.error || 'Paylaşılan şablon bulunamadı');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    const toggleSelect = (idx) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const handleImport = async () => {
        if (selected.size === 0 || !sharedTemplate) return;
        setImporting(true);
        try {
            const selectedItems = sharedTemplate.items
                .filter((_, i) => selected.has(i))
                .map(item => ({
                    appName: item.appName,
                    severity: item.severity,
                    importance: item.importance || 1,
                    content: item.content,
                }));

            if (targetTemplateId === '__new__') {
                // Create new template
                await api.post('/templates', {
                    name: templateName || 'İçe Aktarılan Şablon',
                    items: selectedItems,
                });
            } else {
                // Append to existing template
                const existing = myTemplates.find(t => t.id === targetTemplateId);
                if (existing) {
                    const mergedItems = [...existing.items, ...selectedItems];
                    await api.put(`/templates/${targetTemplateId}`, {
                        items: mergedItems,
                    });
                }
            }

            setImportDone(true);
            setTimeout(() => navigate('/templates'), 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'İçe aktarma başarısız');
        } finally {
            setImporting(false);
        }
    };

    const stripHtml = (html) => {
        const div = document.createElement('div');
        div.innerHTML = html || '';
        return div.textContent?.substring(0, 120) || '';
    };

    return (
        <div className="flex min-h-screen bg-[var(--color-background)]">
            <Sidebar />

            <div className="flex-1 ml-[260px] transition-all duration-300">
                <Header
                    title="📥 Şablon İçe Aktarma"
                    subtitle="Import Shared Template"
                    teamName={user?.teamId || ''}
                    logoSrc="/logo.png"
                />

                <main className="p-8 max-w-2xl mx-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
                            <p className="text-sm text-slate-400">Paylaşılan şablon yükleniyor...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                                <FileText size={28} className="text-red-400" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-700 mb-1">Şablon Bulunamadı</h3>
                            <p className="text-sm text-slate-400 mb-5 max-w-sm">{error}</p>
                            <button
                                onClick={() => navigate('/templates')}
                                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                                <ArrowLeft size={14} />
                                Şablonlarıma Dön
                            </button>
                        </div>
                    ) : importDone ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                                <Check size={28} className="text-emerald-500" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-700 mb-1">
                                Başarıyla İçe Aktarıldı!
                            </h3>
                            <p className="text-sm text-slate-400">
                                Şablonlarınıza yönlendiriliyorsunuz...
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Shared Template Info */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 animate-fade-in-up">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <FileText size={22} className="text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-base font-bold text-slate-900 mb-1">
                                            {sharedTemplate.name}
                                        </h3>
                                        <p className="text-sm text-slate-500">
                                            {sharedTemplate.items.length} madde içeriyor
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Target Template Selector */}
                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Hedef Şablon
                                </label>
                                <select
                                    value={targetTemplateId}
                                    onChange={(e) => setTargetTemplateId(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                >
                                    <option value="__new__">➕ Yeni Şablon Oluştur</option>
                                    {myTemplates.map(t => (
                                        <option key={t.id} value={t.id}>
                                            📋 {t.name} ({t.items.length} madde)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Template Name - only shown when creating new */}
                            {targetTemplateId === '__new__' && (
                                <div className="mb-4">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Yeni Şablon Adı
                                    </label>
                                    <input
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                    />
                                </div>
                            )}

                            {/* Info when adding to existing */}
                            {targetTemplateId !== '__new__' && (
                                <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                    <p className="text-xs text-blue-700">
                                        Seçtiğiniz maddeler <strong>{myTemplates.find(t => t.id === targetTemplateId)?.name}</strong> şablonuna eklenecektir.
                                    </p>
                                </div>
                            )}

                            {/* Items */}
                            <div className="space-y-2 mb-6">
                                <p className="text-xs font-semibold text-slate-500 mb-2">
                                    Eklemek istediğiniz maddeleri seçin:
                                </p>
                                {sharedTemplate.items.map((item, index) => {
                                    const isSelected = selected.has(index);
                                    const sc = severityConfig[item.severity] || severityConfig.info;
                                    return (
                                        <div
                                            key={index}
                                            onClick={() => toggleSelect(index)}
                                            className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all animate-fade-in-up ${isSelected
                                                ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-200'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${isSelected
                                                ? 'bg-blue-500 border-blue-500'
                                                : 'border-slate-300'
                                            }`}>
                                                {isSelected && <Check size={12} className="text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${sc.bg}`}>
                                                        <sc.Icon size={11} className={sc.color} />
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-800">
                                                        {item.appName}
                                                    </span>
                                                    <span className={`text-[10px] font-semibold uppercase ${sc.color}`}>
                                                        {sc.label}
                                                    </span>
                                                    {item.importance > 1 && (
                                                        <span className={`text-[10px] ${item.importance === 3 ? 'text-red-400' : 'text-amber-400'}`}>
                                                            {'★'.repeat(item.importance)}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 line-clamp-2">
                                                    {stripHtml(item.content)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => navigate('/templates')}
                                    className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                    <ArrowLeft size={14} />
                                    Vazgeç
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={selected.size === 0 || importing}
                                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                                >
                                    <Download size={14} />
                                    {importing
                                        ? 'İçe Aktarılıyor...'
                                        : targetTemplateId === '__new__'
                                            ? `${selected.size} Maddeyi Yeni Şablona Aktar`
                                            : `${selected.size} Maddeyi Mevcut Şablona Ekle`
                                    }
                                </button>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
