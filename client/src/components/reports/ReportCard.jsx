import SeverityBadge, { severityConfig } from './SeverityBadge';
import { Pencil, Trash2, Clock, User } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';

export default function ReportCard({ report, onEdit, onDelete, currentUserId }) {
    const config = severityConfig[report.severity] || severityConfig.info;
    const { Icon } = config;
    const { canEdit, canDelete } = usePermission();

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const showEdit = canEdit(report);
    const showDelete = canDelete(report);

    return (
        <div
            className={`report-card group relative bg-white rounded-xl border border-slate-200/80 overflow-hidden animate-fade-in-up ${report.severity === 'escalation' ? 'ring-1 ring-red-200' : ''
                }`}
        >
            {/* Severity color bar */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ backgroundColor: config.color }}
            />

            <div className="flex gap-4 p-5 pl-6">
                {/* Icon column */}
                <div
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${config.bgClass} ${report.severity === 'escalation' ? 'severity-escalation-pulse' : ''
                        }`}
                >
                    <Icon size={20} className={config.textClass} />
                </div>

                {/* Content column */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900">{report.appName}</h3>
                            <SeverityBadge severity={report.severity} size="sm" />
                            {report.importance && report.importance > 1 && (
                                <span className={`text-xs font-bold leading-none ${
                                    report.importance === 3 ? 'text-red-400' : 'text-amber-400'
                                }`} title={`Önem: ${'★'.repeat(report.importance)}`}>
                                    {'★'.repeat(report.importance)}
                                </span>
                            )}
                        </div>

                        {/* Actions — shown only when user has permission */}
                        {(showEdit || showDelete) && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {showEdit && (
                                    <button
                                        onClick={() => onEdit?.(report)}
                                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Düzenle"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                                {showDelete && (
                                    <button
                                        onClick={() => onDelete?.(report.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Sil"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Rich content */}
                    <div
                        className="text-sm text-slate-600 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:text-slate-800 [&_strong]:font-semibold [&_img]:rounded-lg [&_img]:max-w-full [&_img]:my-2"
                        dangerouslySetInnerHTML={{ __html: report.content }}
                    />

                    {/* Footer */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <User size={11} />
                            {report.user?.name || 'Unknown'}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <Clock size={11} />
                            {formatDate(report.createdAt)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
