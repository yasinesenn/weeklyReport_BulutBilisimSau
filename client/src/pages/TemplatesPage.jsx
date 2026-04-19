import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import TemplateEditor from '../components/templates/TemplateEditor';
import ShareModal from '../components/templates/ShareModal';
import ItemPickerModal from '../components/templates/ItemPickerModal';
import {
    Plus, FileText, Clock, Pencil, Trash2, Share2, Copy, EllipsisVertical, Download
} from 'lucide-react';

export default function TemplatesPage() {
    const { user } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editTemplate, setEditTemplate] = useState(null);
    const [showShareModal, setShowShareModal] = useState(null);
    const [showItemPicker, setShowItemPicker] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);

    // Close dropdown on any outside click
    useEffect(() => {
        if (!openMenu) return;
        const handleClick = () => setOpenMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [openMenu]);

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

    useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

    const handleCreate = () => {
        setEditTemplate(null);
        setShowEditor(true);
    };

    const handleEdit = (template) => {
        setEditTemplate(template);
        setShowEditor(true);
        setOpenMenu(null);
    };

    const handleDelete = async (id) => {
        if (!confirm('Bu template\'i silmek istediğinize emin misiniz?')) return;
        try {
            await api.delete(`/templates/${id}`);
            fetchTemplates();
        } catch (err) {
            alert(err.response?.data?.error || 'Silme işlemi başarısız');
        }
        setOpenMenu(null);
    };

    const handleSave = async (data) => {
        if (editTemplate) {
            await api.put(`/templates/${editTemplate.id}`, data);
        } else {
            await api.post('/templates', data);
        }
        fetchTemplates();
    };

    const handleShare = (template) => {
        setShowShareModal(template);
        setOpenMenu(null);
    };

    const handleDuplicate = async (template) => {
        try {
            await api.post('/templates', {
                name: `${template.name} (Kopya)`,
                items: template.items,
            });
            fetchTemplates();
        } catch (err) {
            alert('Kopyalama başarısız');
        }
        setOpenMenu(null);
    };

    const handleAddItemsFromPicker = async (templateId, newItems) => {
        const template = templates.find(t => t.id === templateId);
        if (!template) return;
        const updatedItems = [...template.items, ...newItems];
        await api.put(`/templates/${templateId}`, { items: updatedItems });
        fetchTemplates();
    };

    const handleExportPDF = (template) => {
        const token = localStorage.getItem('token');
        const url = `/api/export/template/${template.id}?token=${encodeURIComponent(token)}`;
        const a = document.createElement('a');
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setOpenMenu(null);
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('tr-TR', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const severityColors = {
        info: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
        highlight: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
        lowlight: { bg: 'bg-slate-50', text: 'text-slate-500', dot: 'bg-slate-400' },
        escalation: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
    };

    return (
        <div className="flex min-h-screen bg-[var(--color-background)]">
            <Sidebar />

            <div className="flex-1 ml-[260px] transition-all duration-300">
                <Header
                    title="📋 Şablonlar"
                    subtitle="Template Manager"
                    teamName={user?.teamId || ''}
                    logoSrc="/logo.png"
                />

                <main className="p-8">
                    {/* Top */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Rapor Şablonları</h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Şablonlarınızı oluşturun, düzenleyin ve paylaşın
                            </p>
                        </div>
                        <button
                            onClick={handleCreate}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all"
                        >
                            <Plus size={16} />
                            Yeni Şablon
                        </button>
                    </div>

                    {/* Template Cards */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                                    <div className="h-5 bg-slate-200 rounded w-2/3 mb-3" />
                                    <div className="h-3 bg-slate-100 rounded w-1/3 mb-4" />
                                    <div className="flex gap-2">
                                        <div className="h-6 w-14 bg-slate-100 rounded-full" />
                                        <div className="h-6 w-14 bg-slate-100 rounded-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : templates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center mb-5">
                                <FileText size={36} className="text-blue-400" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-700 mb-1">Henüz şablonunuz yok</h3>
                            <p className="text-sm text-slate-400 mb-5 max-w-sm">
                                Rapor şablonu oluşturarak haftalık raporlarınızı hızlıca hazırlayabilirsiniz
                            </p>
                            <button
                                onClick={handleCreate}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-md shadow-blue-500/20"
                            >
                                <Plus size={16} />
                                İlk Şablonunuzu Oluşturun
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map((template, idx) => (
                                <div
                                    key={template.id}
                                    className="template-card group bg-white rounded-xl border border-slate-200/80 animate-fade-in-up hover:shadow-lg hover:border-slate-300/80 transition-all duration-200"
                                    style={{ animationDelay: `${idx * 60}ms` }}
                                >
                                    {/* Card Header */}
                                    <div className="p-5">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-bold text-slate-900 truncate mb-1">
                                                    {template.name}
                                                </h3>
                                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                                    <Clock size={11} />
                                                    {formatDate(template.updatedAt)}
                                                </div>
                                            </div>
                                            {/* Actions */}
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenu(openMenu === template.id ? null : template.id);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                >
                                                    <EllipsisVertical size={16} />
                                                </button>
                                                {openMenu === template.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] py-1 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={() => handleEdit(template)}
                                                                className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                            >
                                                                <Pencil size={14} className="text-slate-400" />
                                                                Düzenle
                                                            </button>
                                                            <button
                                                                onClick={() => handleDuplicate(template)}
                                                                className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                            >
                                                                <Copy size={14} className="text-slate-400" />
                                                                Kopyala
                                                            </button>
                                                            <button
                                                                onClick={() => handleShare(template)}
                                                                className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                            >
                                                                <Share2 size={14} className="text-blue-400" />
                                                                Paylaş
                                                            </button>
                                                            <button
                                                                onClick={() => handleExportPDF(template)}
                                                                className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                                            >
                                                                <Download size={14} className="text-emerald-400" />
                                                                PDF İndir
                                                            </button>
                                                            <div className="h-px bg-slate-100 my-1" />
                                                            <button
                                                                onClick={() => handleDelete(template.id)}
                                                                className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                                Sil
                                                            </button>
                                                        </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Items Count */}
                                        <div className="flex items-center gap-1.5 mb-3">
                                            <span className="text-xs font-medium text-slate-500">
                                                {template.items.length} madde
                                            </span>
                                            {template.shareToken && (
                                                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                    <Share2 size={9} />
                                                    Paylaşılıyor
                                                </span>
                                            )}
                                        </div>

                                        {/* Severity Tags */}
                                        <div className="flex flex-wrap gap-1.5">
                                            {template.items.slice(0, 4).map((item, i) => {
                                                const sc = severityColors[item.severity] || severityColors.info;
                                                return (
                                                    <span
                                                        key={i}
                                                        className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-lg ${sc.bg} ${sc.text}`}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                        {item.appName || 'Uygulama'}
                                                    </span>
                                                );
                                            })}
                                            {template.items.length > 4 && (
                                                <span className="text-[10px] font-medium text-slate-400 px-2 py-1">
                                                    +{template.items.length - 4}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="flex border-t border-slate-100">
                                        <button
                                            onClick={() => handleEdit(template)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                        >
                                            <Pencil size={12} />
                                            Düzenle
                                        </button>
                                        <div className="w-px bg-slate-100" />
                                        <button
                                            onClick={() => {
                                                setShowItemPicker(template);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                                        >
                                            <Plus size={12} />
                                            Madde Ekle
                                        </button>
                                        <div className="w-px bg-slate-100" />
                                        <button
                                            onClick={() => handleExportPDF(template)}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-colors"
                                        >
                                            <Download size={12} />
                                            PDF
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Template Editor Modal */}
            {showEditor && (
                <TemplateEditor
                    template={editTemplate}
                    onSave={handleSave}
                    onClose={() => { setShowEditor(false); setEditTemplate(null); }}
                />
            )}

            {/* Share Modal */}
            {showShareModal && (
                <ShareModal
                    template={showShareModal}
                    onClose={() => setShowShareModal(null)}
                    onRefresh={fetchTemplates}
                />
            )}

            {/* Item Picker Modal */}
            {showItemPicker && (
                <ItemPickerModal
                    onSelect={(items) => {
                        handleAddItemsFromPicker(showItemPicker.id, items);
                        setShowItemPicker(null);
                    }}
                    onClose={() => setShowItemPicker(null)}
                />
            )}
        </div>
    );
}
