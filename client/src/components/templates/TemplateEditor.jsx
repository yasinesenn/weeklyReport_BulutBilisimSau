import { useState, useEffect } from 'react';
import {
    X, Plus, Trash2, ChevronUp, ChevronDown,
    Info, Sun, Cloud, AlertTriangle, Star, GripVertical
} from 'lucide-react';
import RichTextEditor from '../editor/RichTextEditor';

const severityOptions = [
    { value: 'highlight', label: 'Highlight', Icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', activeBg: 'bg-amber-500' },
    { value: 'escalation', label: 'Escalation', Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', activeBg: 'bg-red-500' },
    { value: 'lowlight', label: 'Lowlight', Icon: Cloud, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', activeBg: 'bg-slate-500' },
    { value: 'info', label: 'Info', Icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', activeBg: 'bg-blue-500' },
];

const importanceOptions = [
    { value: 1, label: '★', activeText: 'text-slate-600', activeBorder: 'border-slate-300', activeBg: 'bg-slate-100' },
    { value: 2, label: '★★', activeText: 'text-amber-600', activeBorder: 'border-amber-300', activeBg: 'bg-amber-50' },
    { value: 3, label: '★★★', activeText: 'text-red-600', activeBorder: 'border-red-300', activeBg: 'bg-red-50' },
];

export default function TemplateEditor({ template, onSave, onClose }) {
    const isEdit = !!template;
    const [name, setName] = useState(template?.name || '');
    const [items, setItems] = useState(
        template?.items?.length
            ? template.items.map(item => ({ ...item, id: item.id || crypto.randomUUID() }))
            : [{ id: crypto.randomUUID(), appName: '', severity: 'info', importance: 1, content: '' }]
    );
    const [expandedItem, setExpandedItem] = useState(items[0]?.id || null);
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const addItem = () => {
        const newItem = { id: crypto.randomUUID(), appName: '', severity: 'info', importance: 1, content: '' };
        setItems(prev => [...prev, newItem]);
        setExpandedItem(newItem.id);
    };

    const removeItem = (id) => {
        if (items.length <= 1) return;
        setItems(prev => prev.filter(i => i.id !== id));
        if (expandedItem === id) {
            setExpandedItem(items.find(i => i.id !== id)?.id || null);
        }
    };

    const updateItem = (id, field, value) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const moveItem = (index, direction) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= items.length) return;
        const newItems = [...items];
        [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
        setItems(newItems);
    };

    const validate = () => {
        const errs = {};
        if (!name.trim()) errs.name = 'Şablon adı gerekli';
        if (items.length === 0) errs.items = 'En az bir madde ekleyin';
        items.forEach((item, i) => {
            if (!item.appName.trim()) errs[`item_${i}_appName`] = 'Uygulama adı gerekli';
        });
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setSubmitting(true);
        try {
            await onSave({ name, items });
            onClose();
        } catch (err) {
            setErrors({ submit: err.response?.data?.error || 'Bir hata oluştu' });
        } finally {
            setSubmitting(false);
        }
    };

    const severityLabel = (severity) => {
        const opt = severityOptions.find(o => o.value === severity);
        return opt ? opt.label : severity;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 glass" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col mx-4 animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {isEdit ? 'Şablonu Düzenle' : 'Yeni Şablon'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Birden fazla madde ekleyerek şablonunuzu oluşturun
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Template Name */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Şablon Adı
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Örn: Haftalık Geliştirme Raporu"
                            className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all ${errors.name ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                        />
                        {errors.name && <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>}
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-semibold text-slate-700">
                                Maddeler ({items.length})
                            </label>
                            <button
                                onClick={addItem}
                                className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                <Plus size={13} />
                                Madde Ekle
                            </button>
                        </div>

                        <div className="space-y-2">
                            {items.map((item, index) => {
                                const isExpanded = expandedItem === item.id;
                                const sevOpt = severityOptions.find(o => o.value === item.severity);
                                const SevIcon = sevOpt?.Icon || Info;

                                return (
                                    <div
                                        key={item.id}
                                        className={`border rounded-xl transition-all ${isExpanded
                                            ? 'border-blue-200 bg-blue-50/30 shadow-sm'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        {/* Item header — clickable to expand/collapse */}
                                        <div
                                            className="flex items-center gap-2 px-4 py-3 cursor-pointer"
                                            onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                                        >
                                            <GripVertical size={14} className="text-slate-300 flex-shrink-0" />
                                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${sevOpt?.bg?.split(' ')[0] || 'bg-blue-50'}`}>
                                                <SevIcon size={13} className={sevOpt?.color || 'text-blue-500'} />
                                            </div>
                                            <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                                                {item.appName || `Madde ${index + 1}`}
                                            </span>
                                            <span className={`text-[10px] font-semibold uppercase tracking-wide ${sevOpt?.color || 'text-slate-400'}`}>
                                                {severityLabel(item.severity)}
                                            </span>
                                            {item.importance > 1 && (
                                                <span className={`text-xs font-bold ${item.importance === 3 ? 'text-red-400' : 'text-amber-400'}`}>
                                                    {'★'.repeat(item.importance)}
                                                </span>
                                            )}
                                            <div className="flex items-center gap-0.5 ml-1">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveItem(index, -1); }}
                                                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors disabled:opacity-30"
                                                    disabled={index === 0}
                                                >
                                                    <ChevronUp size={13} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveItem(index, 1); }}
                                                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors disabled:opacity-30"
                                                    disabled={index === items.length - 1}
                                                >
                                                    <ChevronDown size={13} />
                                                </button>
                                                {items.length > 1 && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                                                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded editor */}
                                        {isExpanded && (
                                            <div className="px-4 pb-4 space-y-3 border-t border-slate-100 mt-0 pt-3">
                                                {/* Severity */}
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-slate-500 mb-1.5">
                                                        Seviye
                                                    </label>
                                                    <div className="grid grid-cols-4 gap-1.5">
                                                        {severityOptions.map(opt => {
                                                            const isActive = item.severity === opt.value;
                                                            return (
                                                                <button
                                                                    key={opt.value}
                                                                    type="button"
                                                                    onClick={() => updateItem(item.id, 'severity', opt.value)}
                                                                    className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg border transition-all text-[11px] font-semibold ${isActive
                                                                        ? `${opt.bg} ${opt.color} ring-1 ring-offset-1`
                                                                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    <opt.Icon size={13} />
                                                                    {opt.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Importance */}
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-slate-500 mb-1.5">
                                                        Önem Derecesi
                                                    </label>
                                                    <div className="flex gap-1.5">
                                                        {importanceOptions.map(opt => {
                                                            const isActive = item.importance === opt.value;
                                                            return (
                                                                <button
                                                                    key={opt.value}
                                                                    type="button"
                                                                    onClick={() => updateItem(item.id, 'importance', opt.value)}
                                                                    className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${isActive
                                                                        ? `${opt.activeBg} ${opt.activeBorder} ${opt.activeText} shadow-sm`
                                                                        : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                                                    }`}
                                                                >
                                                                    {opt.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* App Name */}
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                                                        Uygulama Adı
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={item.appName}
                                                        onChange={(e) => updateItem(item.id, 'appName', e.target.value)}
                                                        placeholder="Örn: Payment Service"
                                                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all ${errors[`item_${index}_appName`] ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                                                    />
                                                </div>

                                                {/* Content */}
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                                                        İçerik
                                                    </label>
                                                    <RichTextEditor
                                                        content={item.content}
                                                        onChange={(html) => updateItem(item.id, 'content', html)}
                                                        placeholder="Rapor içeriğini yazın..."
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {errors.items && <p className="text-[10px] text-red-500 mt-1">{errors.items}</p>}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 flex-shrink-0">
                    <button
                        onClick={addItem}
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        <Plus size={14} />
                        Yeni Madde
                    </button>
                    <div className="flex items-center gap-3">
                        {errors.submit && (
                            <span className="text-xs text-red-500">{errors.submit}</span>
                        )}
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                        >
                            {submitting ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Kaydet'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
