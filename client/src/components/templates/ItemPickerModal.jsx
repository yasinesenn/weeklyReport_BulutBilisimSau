import { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { getCurrentWeekYear } from '../../utils/weekHelper';
import {
    X, Search, Check, ChevronLeft, ChevronRight,
    FileText, NotebookText, Info, Sun, Cloud, AlertTriangle,
    Link2
} from 'lucide-react';

const severityConfig = {
    info: { Icon: Info, color: 'text-blue-500', bg: 'bg-blue-50' },
    highlight: { Icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50' },
    lowlight: { Icon: Cloud, color: 'text-slate-500', bg: 'bg-slate-50' },
    escalation: { Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
};

export default function ItemPickerModal({ onSelect, onClose }) {
    const { week: currentWeek, year: currentYear } = getCurrentWeekYear();
    const [tab, setTab] = useState('reports'); // 'reports' | 'templates' | 'url'
    const [week, setWeek] = useState(currentWeek);
    const [year, setYear] = useState(currentYear);
    const [reports, setReports] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [allItems, setAllItems] = useState([]); // unified items list
    const [shareUrl, setShareUrl] = useState('');
    const [shareItems, setShareItems] = useState([]);
    const [shareLoading, setShareLoading] = useState(false);
    const [shareError, setShareError] = useState('');

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/reports', { params: { week, year } });
            setReports(res.data);
        } catch (err) {
            console.error('Failed to fetch reports:', err);
        } finally {
            setLoading(false);
        }
    }, [week, year]);

    const fetchTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/templates');
            const parsed = res.data.map(t => ({
                ...t,
                items: typeof t.items === 'string' ? JSON.parse(t.items) : (t.items || []),
            }));
            setTemplates(parsed);
        } catch (err) {
            console.error('Failed to fetch templates:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (tab === 'reports') {
            fetchReports();
        } else if (tab === 'templates') {
            fetchTemplates();
        }
    }, [tab, fetchReports, fetchTemplates]);

    // Build unified items list
    useEffect(() => {
        if (tab === 'reports') {
            setAllItems(reports.map(r => ({
                sourceId: r.id,
                sourceType: 'report',
                appName: r.appName,
                severity: r.severity,
                importance: r.importance || 1,
                content: r.content,
                userName: r.user?.name || 'Unknown',
                week: r.week,
                year: r.year,
            })));
        } else if (tab === 'templates') {
            const items = [];
            templates.forEach(t => {
                (t.items || []).forEach(item => {
                    items.push({
                        sourceId: `${t.id}-${item.id}`,
                        sourceType: 'template',
                        templateName: t.name,
                        appName: item.appName,
                        severity: item.severity,
                        importance: item.importance || 1,
                        content: item.content,
                    });
                });
            });
            setAllItems(items);
        } else if (tab === 'url') {
            setAllItems(shareItems.map((item, i) => ({
                sourceId: `share-${i}`,
                sourceType: 'shared',
                appName: item.appName,
                severity: item.severity,
                importance: item.importance || 1,
                content: item.content,
            })));
        }
        setSelected(new Set());
    }, [tab, reports, templates, shareItems]);

    const toggleSelect = (sourceId) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(sourceId)) next.delete(sourceId);
            else next.add(sourceId);
            return next;
        });
    };

    const selectAll = () => {
        if (selected.size === allItems.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(allItems.map(i => i.sourceId)));
        }
    };

    const handleConfirm = () => {
        const selectedItems = allItems
            .filter(i => selected.has(i.sourceId))
            .map(i => ({
                id: crypto.randomUUID(),
                appName: i.appName,
                severity: i.severity,
                importance: i.importance,
                content: i.content,
            }));
        onSelect(selectedItems);
    };

    const changeWeek = (delta) => {
        let newWeek = week + delta;
        let newYear = year;
        if (newWeek < 1) { newWeek = 52; newYear--; }
        if (newWeek > 52) { newWeek = 1; newYear++; }
        setWeek(newWeek);
        setYear(newYear);
    };

    const handleImportFromUrl = async () => {
        setShareError('');
        setShareLoading(true);
        try {
            // Extract token from URL
            const url = shareUrl.trim();
            const tokenMatch = url.match(/\/share\/([a-f0-9]+)/i) || url.match(/([a-f0-9]{32})/i);
            const token = tokenMatch ? tokenMatch[1] : url;
            
            const res = await api.get(`/shared/${token}`);
            setShareItems(res.data.items || []);
        } catch (err) {
            setShareError(err.response?.data?.error || 'Paylaşılan şablon bulunamadı');
            setShareItems([]);
        } finally {
            setShareLoading(false);
        }
    };

    const stripHtml = (html) => {
        const div = document.createElement('div');
        div.innerHTML = html || '';
        return div.textContent?.substring(0, 80) || '';
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 glass" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4 animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Madde Seç</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Mevcut raporlardan, şablonlardan veya paylaşılan linkten madde ekleyin
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 px-6 flex-shrink-0">
                    <button
                        onClick={() => setTab('reports')}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'reports'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <FileText size={14} />
                        Raporlar
                    </button>
                    <button
                        onClick={() => setTab('templates')}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'templates'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <NotebookText size={14} />
                        Şablonlar
                    </button>
                    <button
                        onClick={() => setTab('url')}
                        className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === 'url'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <Link2 size={14} />
                        URL ile Ekle
                    </button>
                </div>

                {/* Week Selector for Reports tab */}
                {tab === 'reports' && (
                    <div className="flex items-center justify-center gap-3 px-6 py-3 border-b border-slate-50 flex-shrink-0">
                        <button onClick={() => changeWeek(-1)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-semibold text-slate-700 min-w-[100px] text-center">
                            {year} - W{String(week).padStart(2, '0')}
                        </span>
                        <button onClick={() => changeWeek(1)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}

                {/* URL input for URL tab */}
                {tab === 'url' && (
                    <div className="px-6 py-3 border-b border-slate-50 flex-shrink-0">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={shareUrl}
                                onChange={(e) => setShareUrl(e.target.value)}
                                placeholder="Paylaşım URL'si veya token yapıştırın..."
                                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                            />
                            <button
                                onClick={handleImportFromUrl}
                                disabled={!shareUrl.trim() || shareLoading}
                                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl disabled:opacity-50 transition-all"
                            >
                                {shareLoading ? 'Yükleniyor...' : 'Getir'}
                            </button>
                        </div>
                        {shareError && (
                            <p className="text-xs text-red-500 mt-2">{shareError}</p>
                        )}
                    </div>
                )}

                {/* Items List */}
                <div className="flex-1 overflow-y-auto px-6 py-3">
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="p-4 border border-slate-200 rounded-xl animate-pulse">
                                    <div className="flex gap-3">
                                        <div className="w-5 h-5 bg-slate-200 rounded" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-slate-200 rounded w-1/3" />
                                            <div className="h-3 bg-slate-100 rounded w-2/3" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : allItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                                <Search size={24} className="text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500">
                                {tab === 'reports' ? 'Bu haftada rapor bulunamadı' :
                                 tab === 'templates' ? 'Şablon bulunamadı' :
                                 'URL\'den madde yüklemek için paylaşım linkini girin'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Select All */}
                            <button
                                onClick={selectAll}
                                className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-2 transition-colors"
                            >
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selected.size === allItems.length
                                    ? 'bg-blue-500 border-blue-500'
                                    : 'border-slate-300'
                                }`}>
                                    {selected.size === allItems.length && <Check size={10} className="text-white" />}
                                </div>
                                {selected.size === allItems.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                            </button>

                            {allItems.map(item => {
                                const isSelected = selected.has(item.sourceId);
                                const sc = severityConfig[item.severity] || severityConfig.info;
                                return (
                                    <div
                                        key={item.sourceId}
                                        onClick={() => toggleSelect(item.sourceId)}
                                        className={`flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                            ? 'border-blue-300 bg-blue-50/50 ring-1 ring-blue-200'
                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                                        }`}
                                    >
                                        {/* Checkbox */}
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${isSelected
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-slate-300'
                                        }`}>
                                            {isSelected && <Check size={12} className="text-white" />}
                                        </div>

                                        {/* Item info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${sc.bg}`}>
                                                    <sc.Icon size={11} className={sc.color} />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-800 truncate">
                                                    {item.appName}
                                                </span>
                                                {item.importance > 1 && (
                                                    <span className={`text-[10px] ${item.importance === 3 ? 'text-red-400' : 'text-amber-400'}`}>
                                                        {'★'.repeat(item.importance)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">
                                                {stripHtml(item.content)}
                                            </p>
                                            {item.sourceType === 'report' && (
                                                <span className="text-[10px] text-slate-400 mt-1 block">
                                                    {item.userName} • W{item.week}/{item.year}
                                                </span>
                                            )}
                                            {item.sourceType === 'template' && (
                                                <span className="text-[10px] text-slate-400 mt-1 block">
                                                    Şablon: {item.templateName}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
                    <span className="text-xs text-slate-400">
                        {selected.size} madde seçildi
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selected.size === 0}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {selected.size > 0 ? `${selected.size} Madde Ekle` : 'Madde Seçin'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
