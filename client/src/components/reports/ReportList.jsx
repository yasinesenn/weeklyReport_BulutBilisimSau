import ReportCard from './ReportCard';
import { FileX } from 'lucide-react';

export default function ReportList({ reports, onEdit, onDelete, currentUserId, loading }) {
    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                            <div className="flex-1 space-y-3">
                                <div className="h-4 bg-slate-200 rounded w-1/3" />
                                <div className="h-3 bg-slate-100 rounded w-2/3" />
                                <div className="h-3 bg-slate-100 rounded w-1/2" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!reports || reports.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                    <FileX size={28} className="text-slate-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-600 mb-1">Rapor bulunamadı</h3>
                <p className="text-xs text-slate-400">Bu hafta için henüz rapor girilmemiş.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {reports.map((report, idx) => (
                <div key={report.id} style={{ animationDelay: `${idx * 60}ms` }}>
                    <ReportCard
                        report={report}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        currentUserId={currentUserId}
                    />
                </div>
            ))}
        </div>
    );
}
