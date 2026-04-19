import { useState } from 'react';
import { X, Info, Sun, Cloud, AlertTriangle, Star } from 'lucide-react';
import RichTextEditor from '../editor/RichTextEditor';

const severityOptions = [
    { value: 'highlight', label: 'Highlight', Icon: Sun, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200', activeBg: 'bg-amber-500' },
    { value: 'escalation', label: 'Escalation', Icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 border-red-200', activeBg: 'bg-red-500' },
    { value: 'lowlight', label: 'Lowlight', Icon: Cloud, color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', activeBg: 'bg-slate-500' },
    { value: 'info', label: 'Info', Icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200', activeBg: 'bg-blue-500' },
];



const importanceOptions = [
    { value: 1, label: '★', color: 'text-slate-400', activeBg: 'bg-slate-100', activeText: 'text-slate-600', activeBorder: 'border-slate-300' },
    { value: 2, label: '★★', color: 'text-amber-400', activeBg: 'bg-amber-50', activeText: 'text-amber-600', activeBorder: 'border-amber-300' },
    { value: 3, label: '★★★', color: 'text-red-400', activeBg: 'bg-red-50', activeText: 'text-red-600', activeBorder: 'border-red-300' },
];

export default function ReportForm({ report, onSubmit, onClose }) {
    const isEdit = !!report;
    const [formData, setFormData] = useState({
        appName: report?.appName || '',
        severity: report?.severity || 'info',
        importance: report?.importance || 1,
        content: report?.content || '',
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const validate = () => {
        const errs = {};
        if (!formData.appName.trim()) errs.appName = 'Uygulama adı gerekli';
        if (!formData.content.trim() || formData.content === '<p></p>') errs.content = 'İçerik gerekli';
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            await onSubmit(formData, report?.id);
            onClose();
        } catch (err) {
            setErrors({ submit: err.response?.data?.error || 'Bir hata oluştu' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 glass" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {isEdit ? 'Raporu Düzenle' : 'Yeni Rapor'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Haftalık rapor girişi yapın
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Severity Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                            Seviye (Severity)
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {severityOptions.map((opt) => {
                                const isActive = formData.severity === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, severity: opt.value }))}
                                        className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all ${isActive
                                            ? `${opt.bg} border-current ${opt.color} ring-2 ring-offset-1`
                                            : 'border-slate-200 text-slate-400 hover:border-slate-300'
                                            }`}
                                        style={isActive ? { ringColor: opt.color } : {}}
                                    >
                                        <opt.Icon size={20} />
                                        <span className="text-[11px] font-semibold">{opt.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Importance / Priority */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                            Önem Derecesi
                        </label>
                        <div className="flex items-center gap-2">
                            {importanceOptions.map((opt) => {
                                const isActive = formData.importance === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, importance: opt.value }))}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
                                            isActive
                                                ? `${opt.activeBg} ${opt.activeBorder} ${opt.activeText} shadow-sm`
                                                : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className={`text-base leading-none ${isActive ? opt.activeText : opt.color}`}>
                                            {opt.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* App Name */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Uygulama Adı
                        </label>
                        <input
                            type="text"
                            value={formData.appName}
                            onChange={(e) => setFormData(prev => ({ ...prev, appName: e.target.value }))}
                            placeholder="Örn: Payment Service"
                            className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all ${errors.appName ? 'border-red-300 bg-red-50' : 'border-slate-200'
                                }`}
                        />
                        {errors.appName && (
                            <p className="text-[10px] text-red-500 mt-1">{errors.appName}</p>
                        )}
                    </div>

                    {/* Content Editor */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            İçerik
                        </label>
                        <RichTextEditor
                            content={formData.content}
                            onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                            placeholder="Rapor içeriğini yazın... (Resim yapıştırabilirsiniz)"
                        />
                        {errors.content && (
                            <p className="text-[10px] text-red-500 mt-1">{errors.content}</p>
                        )}
                    </div>

                    {/* Error message */}
                    {errors.submit && (
                        <div className="bg-red-50 text-red-600 text-xs px-4 py-2.5 rounded-lg border border-red-200">
                            {errors.submit}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
