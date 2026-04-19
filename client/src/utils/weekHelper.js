/**
 * ISO Week calculation utilities
 */

export function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export function getCurrentWeekYear() {
    const now = new Date();
    return {
        week: getISOWeek(now),
        year: now.getFullYear(),
    };
}

export function getWeekDateRange(week, year) {
    const jan1 = new Date(year, 0, 1);
    const daysOffset = (week - 1) * 7;
    const dayOfWeek = jan1.getDay();
    const mondayOffset = dayOfWeek <= 4 ? 1 - dayOfWeek : 8 - dayOfWeek;
    const monday = new Date(year, 0, 1 + mondayOffset + daysOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (d) =>
        d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

    return `${fmt(monday)} - ${fmt(sunday)}`;
}

export function getWeeksInYear(year) {
    const dec31 = new Date(year, 11, 31);
    return getISOWeek(dec31) === 1 ? 52 : getISOWeek(dec31);
}
