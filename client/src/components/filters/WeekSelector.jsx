import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { getWeekDateRange, getWeeksInYear, getISOWeek } from '../../utils/weekHelper';

/**
 * Get the Monday of a given ISO week
 */
function getWeekMonday(week, year) {
    const jan1 = new Date(year, 0, 1);
    const dayOfWeek = jan1.getDay();
    const mondayOffset = dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek;
    const monday = new Date(year, 0, 1 + mondayOffset + (week - 1) * 7);
    return monday;
}

/**
 * Get all days in a month grid (6 rows x 7 cols) for calendar display
 */
function getCalendarDays(displayYear, displayMonth) {
    const firstDay = new Date(displayYear, displayMonth, 1);
    const lastDay = new Date(displayYear, displayMonth + 1, 0);

    // Start from Monday of the week containing the 1st
    let startDay = firstDay.getDay(); // 0=Sun, 1=Mon...
    startDay = startDay === 0 ? 6 : startDay - 1; // Convert to Mon=0

    const days = [];
    const start = new Date(firstDay);
    start.setDate(start.getDate() - startDay);

    for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
    }

    return days;
}

const MONTH_NAMES = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const DAY_NAMES = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

export default function WeekSelector({ week, year, onChange }) {
    const maxWeeks = getWeeksInYear(year);
    const dateRange = getWeekDateRange(week, year);
    const [showCalendar, setShowCalendar] = useState(false);
    const calendarRef = useRef(null);

    // Calendar display month/year (can navigate independently)
    const currentMonday = getWeekMonday(week, year);
    const [displayMonth, setDisplayMonth] = useState(currentMonday.getMonth());
    const [displayYear, setDisplayYear] = useState(currentMonday.getFullYear());

    // Close calendar on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (calendarRef.current && !calendarRef.current.contains(e.target)) {
                setShowCalendar(false);
            }
        }
        if (showCalendar) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showCalendar]);

    const goBack = () => {
        if (week <= 1) {
            onChange(getWeeksInYear(year - 1), year - 1);
        } else {
            onChange(week - 1, year);
        }
    };

    const goForward = () => {
        if (week >= maxWeeks) {
            onChange(1, year + 1);
        } else {
            onChange(week + 1, year);
        }
    };

    const toggleCalendar = () => {
        if (!showCalendar) {
            // Reset display to current selected week's month
            const monday = getWeekMonday(week, year);
            setDisplayMonth(monday.getMonth());
            setDisplayYear(monday.getFullYear());
        }
        setShowCalendar(!showCalendar);
    };

    const handleDayClick = (date) => {
        const selectedWeek = getISOWeek(date);
        const selectedYear = date.getFullYear();
        // For dates in early January that belong to week 52/53 of prev year
        if (selectedWeek >= 52 && date.getMonth() === 0) {
            onChange(selectedWeek, selectedYear - 1);
        }
        // For dates in late December that belong to week 1 of next year
        else if (selectedWeek === 1 && date.getMonth() === 11) {
            onChange(selectedWeek, selectedYear + 1);
        } else {
            onChange(selectedWeek, selectedYear);
        }
        setShowCalendar(false);
    };

    const goMonthBack = () => {
        if (displayMonth === 0) {
            setDisplayMonth(11);
            setDisplayYear(displayYear - 1);
        } else {
            setDisplayMonth(displayMonth - 1);
        }
    };

    const goMonthForward = () => {
        if (displayMonth === 11) {
            setDisplayMonth(0);
            setDisplayYear(displayYear + 1);
        } else {
            setDisplayMonth(displayMonth + 1);
        }
    };

    const calendarDays = showCalendar ? getCalendarDays(displayYear, displayMonth) : [];

    // Current selected week range for highlighting
    const selectedMonday = getWeekMonday(week, year);
    const selectedSunday = new Date(selectedMonday);
    selectedSunday.setDate(selectedMonday.getDate() + 6);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="relative" ref={calendarRef}>
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
                <button
                    onClick={goBack}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>

                <button
                    onClick={toggleCalendar}
                    className="flex items-center gap-2 min-w-[180px] justify-center hover:bg-slate-50 rounded-lg px-2 py-1 transition-colors"
                    title="Takvimden hafta seç"
                >
                    <Calendar size={14} className={`${showCalendar ? 'text-blue-600' : 'text-blue-500'} transition-colors`} />
                    <span className="text-sm font-bold text-slate-800">
                        {year} - W{String(week).padStart(2, '0')}
                    </span>
                </button>

                <button
                    onClick={goForward}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ChevronRight size={16} />
                </button>

                <div className="hidden sm:block text-[11px] text-slate-400 pl-3 border-l border-slate-200">
                    {dateRange}
                </div>
            </div>

            {/* Calendar Popup */}
            {showCalendar && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl border border-slate-200 shadow-xl p-4 w-[320px] animate-fade-in-up">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={goMonthBack}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-bold text-slate-800">
                            {MONTH_NAMES[displayMonth]} {displayYear}
                        </span>
                        <button
                            onClick={goMonthForward}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-0 mb-1">
                        {DAY_NAMES.map((d) => (
                            <div key={d} className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-0">
                        {calendarDays.map((date, i) => {
                            const isCurrentMonth = date.getMonth() === displayMonth;
                            const isToday = date.getTime() === today.getTime();
                            const isInSelectedWeek = date >= selectedMonday && date <= selectedSunday;
                            const isMonday = date.getDay() === 1;
                            const isSunday = date.getDay() === 0;

                            return (
                                <button
                                    key={i}
                                    onClick={() => handleDayClick(date)}
                                    className={`
                                        relative h-8 text-xs font-medium transition-all
                                        ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                                        ${isInSelectedWeek
                                            ? 'bg-blue-100 text-blue-700 font-bold'
                                            : 'hover:bg-slate-50'
                                        }
                                        ${isInSelectedWeek && isMonday ? 'rounded-l-lg' : ''}
                                        ${isInSelectedWeek && isSunday ? 'rounded-r-lg' : ''}
                                        ${isToday ? 'ring-1 ring-blue-400 ring-inset rounded-lg' : ''}
                                    `}
                                    title={`W${getISOWeek(date)}`}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    {/* Today shortcut */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-center">
                        <button
                            onClick={() => {
                                const now = new Date();
                                const todayWeek = getISOWeek(now);
                                onChange(todayWeek, now.getFullYear());
                                setShowCalendar(false);
                            }}
                            className="text-xs font-semibold text-blue-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Bugün
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
