export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// European convention: day.month.year, e.g. 05.07.2026.
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}.${month}.${year}`;
}

// Day + month only (no year), e.g. 05.07. Used for recurring events like birthdays.
export function formatDayMonth(dateStr: string): string {
  const d = new Date(dateStr);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Month name + day, no year, e.g. "July 10". Used for recurring events like birthdays.
export function formatMonthDay(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

// Days from today until the next occurrence of this birthdate (0 = today,
// wraps to next year once it's passed).
export function daysUntilNextBirthday(birthdate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bday = new Date(birthdate);
  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
  next.setHours(0, 0, 0, 0);

  if (next < today) next.setFullYear(next.getFullYear() + 1);

  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Whole days from today until this date (negative if already past).
export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setUTCHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// Whole days elapsed since this date (negative if it's in the future).
export function daysSince(dateStr: string): number {
  return -daysUntil(dateStr);
}
