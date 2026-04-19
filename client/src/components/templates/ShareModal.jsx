import { useState, useEffect } from 'react';
import api from '../../api/client';
import { X, Share2, Copy, Check, Link2, Link2Off } from 'lucide-react';

export default function ShareModal({ template, onClose, onRefresh }) {
    const [shareToken, setShareToken] = useState(template?.shareToken || null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const shareUrl = shareToken
        ? `${window.location.origin}/share/${shareToken}`
        : null;

    const handleGenerateLink = async () => {
        setLoading(true);
        try {
            const res = await api.post(`/templates/${template.id}/share`);
            setShareToken(res.data.shareToken);
            onRefresh?.();
        } catch (err) {
            alert(err.response?.data?.error || 'Paylaşım linki oluşturulamadı');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeLink = async () => {
        if (!confirm('Paylaşım linkini iptal etmek istediğinize emin misiniz?')) return;
        setLoading(true);
        try {
            await api.delete(`/templates/${template.id}/share`);
            setShareToken(null);
            onRefresh?.();
        } catch (err) {
            alert(err.response?.data?.error || 'İşlem başarısız');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = shareUrl;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40 glass" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-fade-in-up">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                            <Share2 size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">Şablonu Paylaş</h2>
                            <p className="text-xs text-slate-400 truncate max-w-[200px]">{template.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {shareUrl ? (
                        <>
                            {/* Share URL display */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-700">
                                    Paylaşım Linki
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 flex items-center px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                                        <Link2 size={14} className="text-slate-400 flex-shrink-0 mr-2" />
                                        <span className="text-sm text-slate-600 truncate font-mono">
                                            {shareUrl}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleCopy}
                                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${copied
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                        }`}
                                    >
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                        {copied ? 'Kopyalandı!' : 'Kopyala'}
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    <strong>Bu link ile paylaşın:</strong> Diğer kullanıcılar bu linki kullanarak
                                    şablonunuzdaki maddeleri kendi şablonlarına ekleyebilir. Şablonunuzun
                                    içeriği paylaşılır, ancak düzenleme yetkisi verilmez.
                                </p>
                            </div>

                            {/* Revoke */}
                            <button
                                onClick={handleRevokeLink}
                                disabled={loading}
                                className="flex items-center gap-2 text-sm font-medium text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
                            >
                                <Link2Off size={14} />
                                Paylaşım Linkini İptal Et
                            </button>
                        </>
                    ) : (
                        <>
                            {/* No link yet */}
                            <div className="text-center py-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Share2 size={24} className="text-blue-400" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-700 mb-1">
                                    Paylaşım Linki Oluşturun
                                </h3>
                                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-5">
                                    Bir paylaşım linki oluşturarak bu şablondaki maddeleri
                                    diğer kullanıcılarla paylaşabilirsiniz.
                                </p>
                                <button
                                    onClick={handleGenerateLink}
                                    disabled={loading}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                                >
                                    <Link2 size={14} />
                                    {loading ? 'Oluşturuluyor...' : 'Link Oluştur'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
