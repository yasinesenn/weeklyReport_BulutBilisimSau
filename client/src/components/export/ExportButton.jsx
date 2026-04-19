import { FileDown } from 'lucide-react';

export default function ExportButton({ week, year, teamId }) {
    const handleExport = () => {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams({
            week: String(week),
            year: String(year),
            token: token,
        });
        if (teamId) params.set('teamId', teamId);

        // Open directly in browser via dynamic anchor to bypass popup blockers
        const a = document.createElement('a');
        a.href = `/api/export/pdf?${params.toString()}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all"
        >
            <FileDown size={16} />
            PDF / Export
        </button>
    );
}
