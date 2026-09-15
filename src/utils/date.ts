export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

export function isSameDay(year: number, month: number, day: number, target: Date = new Date()): boolean {
  return (
    year === target.getFullYear() &&
    month === target.getMonth() + 1 &&
    day === target.getDate()
  );
}

export function getTodayDateInfo(): { year: number; month: number; day: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

export const getLocalDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseISODate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const current = parseISODate(startStr);
  const end = parseISODate(endStr);

  while (current <= end) {
    dates.push(formatDateToISO(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!m || !d) return dateStr;
  const monthShort = MONTH_NAMES[m - 1]?.slice(0, 3) || '';
  return `${monthShort} ${d}`;
}

export function formatFullDateDisplay(dateStr: string): string {
  const date = parseISODate(dateStr);
  const dayName = WEEKDAYS[date.getDay()];
  const [y, m, d] = dateStr.split('-').map(Number);
  const monthName = MONTH_NAMES[(m || 1) - 1];
  return `${dayName}, ${monthName} ${d}, ${y}`;
}

