/**
 * Returns a calendar date string in ISO format (YYYY-MM-DD).
 */
function formatIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a calendar date string in ISO format (YYYY-MM-DD).
 */
export function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return formatIso(date);
}

/**
 * Returns a calendar date string in ISO format (YYYY-MM-DD).
 */
export function getPastDate(daysAgo: number): string {
  return getFutureDate(-daysAgo);
}

/**
 * Returns a from/to pair spanning calendar days, skipping weekend-only windows.
 * OrangeHRM rejects leave with "No Working Days Selected" if the range has none.
 */
export function getFutureWorkingDayRange(startDaysFromNow: number, spanDays = 2): {
  from: string;
  to: string;
} {
  const from = new Date();
  from.setDate(from.getDate() + startDaysFromNow);

  while (from.getDay() === 0 || from.getDay() === 6) {
    from.setDate(from.getDate() + 1);
  }

  const to = new Date(from);
  to.setDate(to.getDate() + spanDays);

  return { from: formatIso(from), to: formatIso(to) };
}

/**
 * OrangeHRM OS 5.9 Apply Leave uses non-standard yyyy-dd-mm text inputs
 * (year-day-month), not ISO yyyy-MM-dd. Convert before fill().
 */
export function toOrangeHrmDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${year}-${day}-${month}`;
}

export function toOrangeHrmDateRange(fromIso: string, toIso: string): string {
  return `${toOrangeHrmDate(fromIso)} to ${toOrangeHrmDate(toIso)}`;
}
