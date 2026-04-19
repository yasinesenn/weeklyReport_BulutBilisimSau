import { Info, Sun, Cloud, AlertTriangle } from 'lucide-react';

const severityConfig = {
    info: {
        label: 'Info',
        color: 'var(--color-severity-info)',
        bgClass: 'bg-blue-50',
        textClass: 'text-blue-600',
        borderClass: 'border-l-blue-500',
        badgeBg: 'bg-blue-100',
        Icon: Info,
    },
    highlight: {
        label: 'Highlight',
        color: 'var(--color-severity-highlight)',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-600',
        borderClass: 'border-l-amber-400',
        badgeBg: 'bg-amber-100',
        Icon: Sun,
    },
    lowlight: {
        label: 'Lowlight',
        color: 'var(--color-severity-lowlight)',
        bgClass: 'bg-slate-50',
        textClass: 'text-slate-500',
        borderClass: 'border-l-slate-400',
        badgeBg: 'bg-slate-100',
        Icon: Cloud,
    },
    escalation: {
        label: 'Escalation',
        color: 'var(--color-severity-escalation)',
        bgClass: 'bg-red-50',
        textClass: 'text-red-600',
        borderClass: 'border-l-red-500',
        badgeBg: 'bg-red-100',
        Icon: AlertTriangle,
    },
};

export default function SeverityBadge({ severity, size = 'md' }) {
    const config = severityConfig[severity] || severityConfig.info;
    const { Icon, label, badgeBg, textClass } = config;

    const sizeClasses = {
        sm: 'px-2 py-0.5 text-[10px] gap-1',
        md: 'px-2.5 py-1 text-xs gap-1.5',
        lg: 'px-3 py-1.5 text-sm gap-2',
    };

    const iconSizes = { sm: 10, md: 12, lg: 14 };

    return (
        <span
            className={`inline-flex items-center font-semibold rounded-full ${badgeBg} ${textClass} ${sizeClasses[size]}`}
        >
            <Icon size={iconSizes[size]} />
            {label}
        </span>
    );
}

export { severityConfig };
